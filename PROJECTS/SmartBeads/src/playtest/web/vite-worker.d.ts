// Vite `?worker` imports: the AI search worker is bundled as a separate Web Worker file.
declare module '*?worker' {
  const WorkerConstructor: { new (): Worker };
  export default WorkerConstructor;
}
