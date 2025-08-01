export async function sendChatMessage(
  workspaceId: string,
  workspaceType: string,
  message: string,
  currentBoxes?: any[]
) {
  try {
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
      const errorText = await response.text();
      console.error('Chat API error response:', errorText);
      throw new Error(`Chat API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Chat API success:', result);
    return result;
  } catch (error) {
    console.error('Chat message send error:', error);
    throw error;
  }
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
