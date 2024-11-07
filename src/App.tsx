import { useState } from "react";
import "./App.css";
import Canvas from "./canvas";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <Canvas />
    </>
  );
}

export default App;
