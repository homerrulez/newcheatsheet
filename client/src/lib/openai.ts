export async function sendChatMessage(
  workspaceId: string,
  workspaceType: string,
  message: string,
  currentBoxes?: any[]
) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      workspaceType,
      message,
      currentBoxes,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }

  return response.json();
}

export async function getChatMessages(workspaceType: string, workspaceId: string) {
  const response = await fetch(`/api/chat/${workspaceType}/${workspaceId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch chat messages');
  }

  return response.json();
}
