import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Stage, Layer, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import { Upload, Scissors, Save, Plus, Trash2 } from 'lucide-react';
import useImage from 'use-image';

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const UploadedImage: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => {
  const [image] = useImage(src, 'anonymous');
  return <KonvaImage image={image} width={width} height={height} />;
};

const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 600;

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedId, selectPanel] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scaledSize, setScaledSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        const img = new Image();
        img.onload = () => handleImageLoad(img);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('https://detect.roboflow.com/mangareader/4', formData, {
          params: { api_key: '6jW9SuxlP4TFuEhvFkHi' },
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const detectedPanels = response.data.predictions.map((pred: any, index: number) => ({
          id: `panel-${index}`,
          x: pred.x - pred.width / 2,
          y: pred.y - pred.height / 2,
          width: pred.width,
          height: pred.height,
        }));
        setPanels(detectedPanels);
      } catch (error) {
        console.error('Error detecting panels:', error);
      }
    }
  };

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    const aspectRatio = img.width / img.height;
    let newWidth, newHeight;

    if (aspectRatio > FRAME_WIDTH / FRAME_HEIGHT) {
      newWidth = FRAME_WIDTH;
      newHeight = FRAME_WIDTH / aspectRatio;
    } else {
      newHeight = FRAME_HEIGHT;
      newWidth = FRAME_HEIGHT * aspectRatio;
    }

    setImageSize({ width: img.width, height: img.height });
    setScaledSize({ width: newWidth, height: newHeight });
  }, []);

  const handlePanelChange = (index: number, newProps: Partial<Panel>) => {
    setPanels(panels.map((panel, i) => (i === index ? { ...panel, ...newProps } : panel)));
  };

  const handleAddPanel = () => {
    const newPanel: Panel = {
      id: `panel-${panels.length}`,
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    };
    setPanels([...panels, newPanel]);
  };

  const handleDeletePanel = () => {
    if (selectedId) {
      setPanels(panels.filter(panel => panel.id !== selectedId));
      selectPanel(null);
    }
  };

  const handleCut = () => {
    // Implement panel cutting logic here
  };

  const handleSave = () => {
    // Implement saving logic here
  };

  const scalePanel = (panel: Panel) => {
    const scaleX = scaledSize.width / imageSize.width;
    const scaleY = scaledSize.height / imageSize.height;
    return {
      ...panel,
      x: panel.x * scaleX,
      y: panel.y * scaleY,
      width: panel.width * scaleX,
      height: panel.height * scaleY,
    };
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold">Comic Panel Detector</h1>
      </div>
      <div className="flex-1 flex">
        <div className="w-64 bg-gray-100 p-4 flex flex-col space-y-4">
          <label className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600">
            <Upload className="mr-2" />
            Upload Image
            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
          </label>
          <button onClick={handleAddPanel} className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            <Plus className="mr-2" />
            Add Panel
          </button>
          <button onClick={handleDeletePanel} className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            <Trash2 className="mr-2" />
            Delete Panel
          </button>
          <button onClick={handleCut} className="flex items-center justify-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
            <Scissors className="mr-2" />
            Cut Panels
          </button>
          <button onClick={handleSave} className="flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
            <Save className="mr-2" />
            Save Panels
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden" ref={containerRef}>
          <div style={{ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px`, border: '2px solid #ccc' }}>
            {image ? (
              <Stage
                width={FRAME_WIDTH}
                height={FRAME_HEIGHT}
              >
                <Layer>
                  <UploadedImage src={image} width={scaledSize.width} height={scaledSize.height} />
                  {panels.map((panel, index) => {
                    const scaledPanel = scalePanel(panel);
                    return (
                      <React.Fragment key={panel.id}>
                        <Rect
                          {...scaledPanel}
                          onClick={() => selectPanel(panel.id)}
                          onTap={() => selectPanel(panel.id)}
                          fill="transparent"
                          stroke={panel.id === selectedId ? "red" : "blue"}
                          strokeWidth={2}
                          draggable
                          onDragEnd={(e) => {
                            const scaleX = imageSize.width / scaledSize.width;
                            const scaleY = imageSize.height / scaledSize.height;
                            handlePanelChange(index, { 
                              x: e.target.x() * scaleX, 
                              y: e.target.y() * scaleY 
                            });
                          }}
                        />
                        {panel.id === selectedId && (
                          <Transformer
                            ref={(node) => {
                              if (node) {
                                node.nodes([node.getStage()!.findOne(`#${panel.id}`)]);
                                node.getLayer()!.batchDraw();
                              }
                            }}
                            boundBoxFunc={(oldBox, newBox) => {
                              if (newBox.width < 5 || newBox.height < 5) {
                                return oldBox;
                              }
                              return newBox;
                            }}
                            onTransformEnd={(e) => {
                              const node = e.target;
                              const scaleX = imageSize.width / scaledSize.width;
                              const scaleY = imageSize.height / scaledSize.height;
                              handlePanelChange(index, {
                                x: node.x() * scaleX,
                                y: node.y() * scaleY,
                                width: node.width() * node.scaleX() * scaleX,
                                height: node.height() * node.scaleY() * scaleY,
                              });
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </Layer>
              </Stage>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl text-gray-500">
                Upload an image to start detecting panels
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;