/**
 * MOCK DATA UTILITIES
 * 
 * This file contains mock data for the communication platform to enable
 * development and testing without relying on the actual database.
 * It provides realistic sample data that simulates posts, users, zones, and interactions.
 */

// Type definitions
export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Zone {
  id: string;
  name: string;
  floor: number;
}

export interface Topic {
  id: string;
  name: string;
}

export interface Reply {
  id: string;
  user: User;
  content: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  zone: Zone | null;
  topics: Topic[];
  likeCount: number;
  liked: boolean;
  replies: Reply[];
  imageUrl: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export const MOCK_USERS: User[] = [
  { id: "user1", name: "Alex Chen", avatar: "/avatars/alex.jpg" },
  { id: "user2", name: "Sarah Kim", avatar: "/avatars/sarah.jpg" },
  { id: "user3", name: "Raj Patel", avatar: "/avatars/raj.jpg" },
  { id: "user4", name: "Maya Johnson", avatar: "/avatars/maya.jpg" },
  { id: "user5", name: "Current User", avatar: "/avatars/default.jpg" },
];

export const MOCK_ZONES: Zone[] = [
  { id: "zone1", name: "Main Reading Area", floor: 1 },
  { id: "zone2", name: "Quiet Study Zone", floor: 1 },
  { id: "zone3", name: "Group Study Rooms", floor: 2 },
  { id: "zone4", name: "Computer Lab", floor: 2 },
  { id: "zone5", name: "Research Commons", floor: 3 },
];

export const MOCK_TOPICS: Topic[] = [
  { id: "topic1", name: "quietspots" },
  { id: "topic2", name: "groupstudy" },
  { id: "topic3", name: "resources" },
  { id: "topic4", name: "examweek" },
  { id: "topic5", name: "events" },
];

/**
 * Generates mock posts for testing the communication platform
 * 
 * @param count - Number of mock posts to generate
 * @returns Array of post objects with realistic data
 */
export function generateMockPosts(count = 15): Post[] {
  const posts: Post[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Randomize creation time within last 24 hours
    const createdAt = new Date(
      now.getTime() - Math.random() * 24 * 60 * 60 * 1000
    );

    // Random user
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

    // Random zone (sometimes null)
    const zone =
      Math.random() > 0.2
        ? MOCK_ZONES[Math.floor(Math.random() * MOCK_ZONES.length)]
        : null;

    // Random topics (0-3)
    const topicCount = Math.floor(Math.random() * 3);
    const topics: Topic[] = [];
    for (let j = 0; j < topicCount; j++) {
      const topic = MOCK_TOPICS[Math.floor(Math.random() * MOCK_TOPICS.length)];
      if (!topics.find((t) => t.id === topic.id)) {
        topics.push(topic);
      }
    }

    // Random content based on context
    let content = "";
    const contentTypes = ["status", "question", "resource", "study_group"];
    const type = contentTypes[Math.floor(Math.random() * contentTypes.length)];

    switch (type) {
      case "status":
        if (zone) {
          const isBusy = Math.random() > 0.5;
          content = isBusy
            ? `${zone.name} is really packed right now! Almost no seats available.`
            : `${zone.name} is surprisingly empty today. Great time to grab a spot!`;
        } else {
          content =
            "Library is " +
            (Math.random() > 0.5 ? "quite busy" : "relatively quiet") +
            " this " +
            (createdAt.getHours() < 12
              ? "morning"
              : createdAt.getHours() < 17
              ? "afternoon"
              : "evening") +
            ".";
        }
        break;
      case "question":
        content =
          Math.random() > 0.5
            ? "Does anyone know if there are any study rooms available right now?"
            : `Is the ${
                MOCK_ZONES[Math.floor(Math.random() * MOCK_ZONES.length)].name
              } usually busy on ${
                [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ][Math.floor(Math.random() * 7)]
              } evenings?`;
        break;
      case "resource":
        content =
          Math.random() > 0.5
            ? "Just found some great engineering textbooks on the second floor, shelf C5."
            : "The library just got new charging stations installed at all the tables in the main area!";
        break;
      case "study_group":
        content = `Looking for study partners for ${
          ["Calculus", "Physics", "Data Structures", "Chemistry", "EE Basics"][
            Math.floor(Math.random() * 5)
          ]
        } final exam. Meeting in ${
          MOCK_ZONES[Math.floor(Math.random() * MOCK_ZONES.length)].name
        } tomorrow at ${Math.floor(Math.random() * 12) + 1}${
          Math.random() > 0.5 ? "pm" : "am"
        }.`;
        break;
    }

    // Add hashtags for topics
    if (topics.length > 0) {
      content += " " + topics.map((t) => "#" + t.name).join(" ");
    }

    // Random like count
    const likeCount = Math.floor(Math.random() * 20);

    // Random replies (0-5)
    const replyCount = Math.floor(Math.random() * 5);
    const replies: Reply[] = [];
    for (let j = 0; j < replyCount; j++) {
      const replyUser =
        MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
      const replyTime = new Date(
        createdAt.getTime() +
          Math.random() * (now.getTime() - createdAt.getTime())
      );

      let replyContent = "";
      if (type === "status") {
        replyContent =
          Math.random() > 0.5
            ? "Thanks for the update!"
            : "Really? Just checked and it changed a lot since then.";
      } else if (type === "question") {
        replyContent =
          Math.random() > 0.5
            ? "Yes, there are two rooms available right now."
            : "Usually gets busy after 3pm, better come early.";
      } else if (type === "resource") {
        replyContent = "That's really helpful, thanks for sharing!";
      } else if (type === "study_group") {
        replyContent =
          Math.random() > 0.5
            ? "I'd like to join! See you there."
            : "What topics are you focusing on?";
      }

      replies.push({
        id: `reply${i}-${j}`,
        user: replyUser,
        content: replyContent,
        createdAt: replyTime,
      });
    }

    // Random image (30% chance)
    const hasImage = Math.random() < 0.3;
    const imageUrl = hasImage
      ? `/mock/library-image-${Math.floor(Math.random() * 5) + 1}.jpg`
      : null;

    // Generate random expiration time (between 10 minutes and 24 hours from creation)
    const expirationOptions = [
      60 * 60 * 1000, // 1 hour
      3 * 60 * 60 * 1000, // 3 hours
      6 * 60 * 60 * 1000, // 6 hours
      24 * 60 * 60 * 1000, // 24 hours
    ];
    const expirationTime =
      expirationOptions[Math.floor(Math.random() * expirationOptions.length)];
    const expiresAt = new Date(createdAt.getTime() + expirationTime);

    // Create post object
    posts.push({
      id: `post${i}`,
      user,
      content,
      zone,
      topics,
      likeCount,
      liked: Math.random() > 0.7, // 30% chance current user liked it
      replies: replies.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      ),
      imageUrl,
      expiresAt, // Add expiration time
      createdAt,
    });
  }

  // Sort by creation time (newest first)
  return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
} 