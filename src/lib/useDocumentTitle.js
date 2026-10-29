import { useEffect } from "react";

/** Keep the tab title in step with the route: client-side navigation never reloads index.html. */
function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export default useDocumentTitle;
