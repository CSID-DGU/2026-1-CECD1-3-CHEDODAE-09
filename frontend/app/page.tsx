import App from "./App";

export default function Page() {
  return (
    <main
      className="mx-auto h-[100dvh] overflow-hidden bg-white"
      style={{ width: "var(--app-max-width)", maxWidth: "100%" }}
    >
      <App />
    </main>
  );
}
