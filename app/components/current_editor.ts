let editor = null;

if (typeof window !== "undefined")
  editor = new URLSearchParams(window.location.search).get("editor");

export { editor };
