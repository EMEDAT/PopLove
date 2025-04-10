// utils/interests.ts

// Categorized interests for worldwide dating app
export const categorizedInterests = {
    outdoorActivities: [
      'Hiking',
      'Camping',
      'Cycling',
      'Beach',
      'Fishing',
      'Gardening',
      'Rock climbing',
      'Surfing',
      'Kayaking',
      'Sailing'
    ],
    
    sports: [
      'Running',
      'Fitness',
      'Yoga',
      'Swimming',
      'Basketball',
      'Football',
      'Soccer',
      'Volleyball',
      'Tennis',
      'Golf',
      'Cricket',
      'Rugby',
      'Table tennis',
      'Martial arts',
      'Skiing',
      'Snowboarding'
    ],
    
    foodAndDrink: [
      'Cooking',
      'Foodie',
      'Coffee',
      'Wine tasting',
      'Craft beer',
      'Baking',
      'BBQ',
      'Vegan cuisine',
      'Tea culture',
      'Mixology'
    ],
    
    artsAndCreative: [
      'Photography',
      'Art',
      'Painting',
      'Music',
      'Dancing',
      'Concerts',
      'Writing',
      'DIY',
      'Fashion',
      'Pottery',
      'Knitting'
    ],
    
    entertainment: [
      'Movies',
      'Gaming',
      'Reading',
      'Podcasts',
      'Streaming',
      'Comedy',
      'Theater',
      'Board games',
      'Karaoke',
      'Anime'
    ],
    
    travel: [
      'Travel',
      'Road trips',
      'Backpacking',
      'Cultural exploration',
      'Language learning',
      'History',
      'Architecture'
    ],
    
    lifestyle: [
      'Meditation',
      'Volunteering',
      'Sustainable living',
      'Minimalism',
      'Spirituality'
    ],
    
    social: [
      'Dogs',
      'Cats',
      'Pet lover',
      'Family time',
      'Networking',
      'Political activism',
      'Community service'
    ],
    
    intellectual: [
      'Science',
      'Technology',
      'Philosophy',
      'Psychology',
      'Chess',
      'Debate',
      'Investing'
    ],
    
    digital: [
      'Social media',
      'Blogging',
      'Podcasting',
      'Graphic design',
      'Coding',
      'Cryptocurrency',
      'Game Development',
      'Digital art',
      'Virtual reality',
      'Content creation',
    ]
  };
  
  // Flatten the categorized interests to get a complete array
  export const allInterests = Object.values(categorizedInterests).flat();
  
  // Function to get interests by category
  export const getInterestsByCategory = (category: string) => {
    return categorizedInterests[category] || [];
  };