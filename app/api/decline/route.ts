import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Database helper functions
async function getSetting(key: string) {
  try {
    const result = await sql`SELECT value FROM settings WHERE key = ${key}`;
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
    return null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return null;
  }
}

async function getStat(key: string, defaultValue: any = 0) {
  try {
    const result = await sql`SELECT value FROM stats WHERE key = ${key}`;
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error getting stat ${key}:`, error);
    return defaultValue;
  }
}

async function setStat(key: string, value: any) {
  try {
    const jsonValue = JSON.stringify(value);
    await sql`
      INSERT INTO stats (key, value, updated_at)
      VALUES (${key}, ${jsonValue}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${jsonValue}, updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error(`Error setting stat ${key}:`, error);
  }
}

interface FriendRequest {
  id: number;
  userId: number;
  username: string;
  displayName: string;
}

interface UserProfile {
  id: number;
  name: string;
  displayName: string;
  description: string;
  created: string;
  isBanned: boolean;
}

interface FriendsData {
  data: Array<{ id: number }>;
}

async function getRobloxUserId(cookie: string): Promise<number> {
  const response = await fetch('https://users.roblox.com/v1/users/authenticated', {
    headers: {
      'Cookie': `.ROBLOSECURITY=${cookie}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Invalid Roblox cookie');
  }
  
  const data = await response.json();
  return data.id;
}

async function getFriendRequests(cookie: string): Promise<FriendRequest[]> {
  let allRequests: FriendRequest[] = [];
  let cursor = '';
  
  // Keep fetching until we have all requests
  while (true) {
    const url = cursor 
      ? `https://friends.roblox.com/v1/my/friends/requests?sortOrder=Desc&limit=100&cursor=${cursor}`
      : 'https://friends.roblox.com/v1/my/friends/requests?sortOrder=Desc&limit=100';
    
    const response = await fetch(url, {
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch friend requests');
    }

    const data = await response.json();
    allRequests = allRequests.concat(data.data || []);
    
    // Check if there's more data
    if (data.nextPageCursor) {
      cursor = data.nextPageCursor;
    } else {
      break; // No more pages
    }
  }
  
  return allRequests;
}

async function getUserProfile(userId: number, cookie: string): Promise<UserProfile> {
  const response = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
    headers: {
      'Cookie': `.ROBLOSECURITY=${cookie}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  return await response.json();
}

async function getUserFriendsCount(userId: number, cookie: string): Promise<number> {
  const response = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, {
    headers: {
      'Cookie': `.ROBLOSECURITY=${cookie}`
    }
  });

  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  return data.count || 0;
}

async function declineFriendRequest(userId: number, cookie: string): Promise<boolean> {
  const myUserId = await getRobloxUserId(cookie);
  
  const response = await fetch(`https://friends.roblox.com/v1/users/${myUserId}/friends/requests/${userId}/decline`, {
    method: 'POST',
    headers: {
      'Cookie': `.ROBLOSECURITY=${cookie}`,
      'Content-Type': 'application/json'
    }
  });

  return response.ok;
}

function isBot(profile: UserProfile, friendsCount: number, filters: any): boolean {
  // Check account age - decline if less than 60 days old (2 months)
  const accountAge = Math.floor((Date.now() - new Date(profile.created).getTime()) / (1000 * 60 * 60 * 24));
  if (accountAge < 60) {
    return true;
  }

  // Check if banned
  if (profile.isBanned) {
    return true;
  }

  // Check description for suspicious patterns
  if (filters.checkDescription && profile.description) {
    const description = profile.description.toLowerCase();
    for (const pattern of filters.suspiciousPatterns) {
      if (description.includes(pattern.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    // Get settings directly from database
    const cookie = await getSetting('roblox_cookie');
    const filters = await getSetting('bot_filters');

    console.log('Cookie exists:', !!cookie);
    console.log('Filters:', filters);

    if (!cookie) {
      return NextResponse.json({ error: 'No Roblox cookie configured' }, { status: 400 });
    }

    if (!filters || !filters.enabled) {
      return NextResponse.json({ error: 'Auto-decline is not enabled' }, { status: 400 });
    }

    // Get all pending friend requests
    console.log('Fetching friend requests...');
    const friendRequests = await getFriendRequests(cookie);
    console.log(`Total friend requests found: ${friendRequests.length}`);
    await setStat('pending_requests', friendRequests.length);

    let declined = 0;
    let checked = 0;

    // Process each friend request
    for (const request of friendRequests) {
      try {
        checked++;
        
        // Get user profile
        const profile = await getUserProfile(request.userId, cookie);
        const friendsCount = await getUserFriendsCount(request.userId, cookie);
        
        const accountAge = Math.floor((Date.now() - new Date(profile.created).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Checking user ${profile.name} (ID: ${request.userId}): Age ${accountAge} days`);

        // Check if user is a bot
        if (isBot(profile, friendsCount, filters)) {
          console.log(`Declining ${profile.name} - Account age: ${accountAge} days`);
          
          // Decline the friend request
          const success = await declineFriendRequest(request.userId, cookie);
          if (success) {
            declined++;
            console.log(`Successfully declined ${profile.name}`);
          } else {
            console.log(`Failed to decline ${profile.name}`);
          }
        } else {
          console.log(`Keeping ${profile.name} - Account age: ${accountAge} days (passed checks)`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing user ${request.userId}:`, error);
      }
    }

    console.log(`Finished: Checked ${checked}, Declined ${declined}`);

    // Update stats
    const totalDeclined = (await getStat('total_declined', 0)) + declined;
    await setStat('total_declined', totalDeclined);
    await setStat('last_run', new Date().toLocaleString());
    await setStat('pending_requests', friendRequests.length - declined);

    return NextResponse.json({
      success: true,
      declined,
      checked: friendRequests.length
    });
  } catch (error: any) {
    console.error('Error in decline API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
