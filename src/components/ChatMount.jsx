import React, { Suspense, lazy } from "react";

// The widget (and the search code behind it) is a separate chunk, so it stays out of the main
// bundle. The widget itself renders nothing unless the build published chat-index.json, which is
// how the CHAT_ENABLED=false kill switch takes the button off the page.
const ChatWidget = lazy(() => import("./ChatWidget"));

function ChatMount() {
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
}

export default ChatMount;
