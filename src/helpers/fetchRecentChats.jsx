
export async function fetchRecentChats(token) {


  const response = await fetch(`${process.env.REACT_APP_API_URL}/chat/recent-chats`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recent chats: ${response.statusText}`);
  }

  const data = await response.json();
  return data; // this should be List<RecentChatterDto>
}