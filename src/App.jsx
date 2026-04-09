import React, { useRef, useState } from 'react';
import { Eraser, Wand2 } from 'lucide-react';
import DrawingCanvas from './components/DrawingCanvas';
import { processCanvas } from './utils/imageProcess';

function App() {
  const canvasRef = useRef(null);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [debugImage, setDebugImage] = useState(null);

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      setPrediction(null);
      setConfidence(null);
      setError(null);
      setDebugImage(null);
    }
  };

  const handlePredict = async () => {
    if (!canvasRef.current) return;
    
    setError(null);
    setIsPredicting(true);

    try {
      const sourceCanvas = canvasRef.current.getCanvas();
      
      // Process canvas to 28x28 grayscale array expected by the model
      const { array, dataUrl } = processCanvas(sourceCanvas);

      // Set debug image for visual verification
      setDebugImage(dataUrl);

      // Call the deployed MNIST API via Vite proxy to bypass CORS
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(array)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      setPrediction(data.prediction);
      setConfidence(null); // API doesn't return confidence currently

    } catch (err) {
      console.error(err);
      setError('Failed to get prediction. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Digit Recognizer</h1>
        <p>Draw a single digit between 0 and 9</p>
      </header>

      <main className="panel">
        <DrawingCanvas ref={canvasRef} />

        <div className="controls">
          <button 
            className="btn btn-secondary" 
            onClick={handleClear}
            disabled={isPredicting}
          >
            <Eraser size={18} />
            Clear
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handlePredict}
            disabled={isPredicting}
          >
            {isPredicting ? (
              <span className="spinner"></span>
            ) : (
              <>
                <Wand2 size={18} />
                Predict
              </>
            )}
          </button>
        </div>
      </main>

      {/* Results Section */}
      <section className="result-area">
        {isPredicting ? (
          <p className="text-muted">Analyzing your drawing...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : prediction !== null ? (
          <>
            <span className="text-muted">Prediction</span>
            <div className="prediction-digit">{prediction}</div>
            {confidence !== null && (
              <div className="prediction-confidence">{confidence}% Confidence</div>
            )}
          </>
        ) : (
          <p className="text-muted">Prediction result will appear here</p>
        )}
      </section>

      {/* Visual Debug: 28x28 processed image */}
      {debugImage && (
        <section className="debug-preview">
          <span className="text-muted">Processed 28×28 Input</span>
          <img
            src={debugImage}
            alt="28x28 processed input"
            className="debug-image"
          />
        </section>
      )}
    </div>
  );
}

export default App;
