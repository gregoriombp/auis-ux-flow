import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@xyflow/react/dist/style.css"
import "./styles.css"
import { App } from "./App"
import { loadFlows } from "./load"

loadFlows().then((result) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App result={result} />
    </StrictMode>,
  )
})
