import { useState } from 'react';
import Draggable from 'react-draggable';

export default function DraggableTest() {
  const [position, setPosition] = useState({ x: 100, y: 100 });

  const handleDragStop = (e: any, data: any) => {
    setPosition({ x: data.x, y: data.y });
  };

  const moveToGrid = () => {
    setPosition({ x: 300, y: 200 });
  };

  const moveToCorner = () => {
    setPosition({ x: 50, y: 50 });
  };

  return (
    <div style={{ width: '800px', height: '600px', border: '1px solid black', position: 'relative' }}>
      <h3>Draggable Control Test</h3>
      <p>Current position: ({position.x}, {position.y})</p>
      
      <button onClick={moveToGrid} style={{ margin: '5px' }}>
        Move to (300, 200)
      </button>
      <button onClick={moveToCorner} style={{ margin: '5px' }}>
        Move to (50, 50)
      </button>

      <Draggable
        position={position}
        onStop={handleDragStop}
      >
        <div style={{
          width: '100px',
          height: '100px',
          backgroundColor: 'red',
          border: '2px solid black',
          position: 'absolute',
          cursor: 'move',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          TEST BOX
        </div>
      </Draggable>
    </div>
  );
}