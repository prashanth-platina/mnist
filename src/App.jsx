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

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      setPrediction(null);
      setConfidence(null);
      setError(null);
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

      // In a real scenario, you'd send `array` or `dataUrl` to your backend:
      // const response = await fetch('/predict', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ image_data: array })
      // });
      // const data = await response.json();
      
      // --- MOCK RESPONSE LOGIC ---
      // Simulating network delay and random digit prediction
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const mockDigit = Math.floor(Math.random() * 10);
      const mockConfidence = (0.75 + Math.random() * 0.24).toFixed(2); // 75% to 99%
      
      setPrediction(mockDigit);
      setConfidence((mockConfidence * 100).toFixed(0));
      // ---------------------------

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
            <div className="prediction-confidence">{confidence}% Confidence</div>
          </>
        ) : (
          <p className="text-muted">Prediction result will appear here</p>
        )}
      </section>
    </div>
  );
}

export default App;
