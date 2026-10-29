import React, { Suspense, lazy, useEffect, useState } from "react";
import { isPreviewHost } from "../lib/previewHost";

// The widget (and the search code behind it) is a separate chunk that is only fetched where it
// may run: local development and Netlify previews. On the production address this renders
// nothing and the chunk is never requested.
const ChatWidget = lazy(() => import("./ChatWidget"));

function ChatMount() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(isPreviewHost(window.location.hostname));
  }, []);

  if (!allowed) return null;
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
}

export default ChatMount;
