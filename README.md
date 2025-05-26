# Melody 🎵

*Decentralized Music Platform on Starknet*
![Screenshot from 2025-05-26 16-37-31](https://github.com/user-attachments/assets/a2b13736-c74e-4870-af4f-9cdc6aa31ef5)

---

## Vision

Melody envisions a revolutionary music ecosystem where artists and listeners connect directly, free from traditional intermediaries. Our platform empowers creators to share their art while building genuine communities around music, all secured by the power of blockchain technology.
![image](https://github.com/user-attachments/assets/01cd8cde-1c26-49d9-ab77-0110dffd0f12)


## Problem Statement

### A Fragmented Music Industry

The current music landscape faces critical challenges that limit both artists and music enthusiasts:

- **Artist Suppression**: Traditional platforms take substantial revenue cuts, leaving artists with minimal compensation for their creativity
- **Limited Discovery**: Emerging artists struggle to reach audiences due to algorithmic bias favoring established names
- **Centralized Control**: Platform owners dictate terms, content policies, and revenue distribution without artist input
- **Lack of Community**: Listeners remain passive consumers with limited ways to support and interact with their favorite artists

## The Melody Solution

Melody transforms the music industry by creating a decentralized platform built on Starknet, where artists maintain control and listeners become active community members.

### Core Features

#### 🎤 **Artist Empowerment**
- **Direct Registration**: Artists can register profiles and maintain complete ownership of their content
- **Revenue Control**: Direct monetization without intermediary fees
- **Collaboration Tools**: Seamless collaboration features for multi-artist projects
- **Profile Management**: Comprehensive artist profiles with stats and portfolio management

#### 🎧 **Enhanced Listening Experience**
- **Reward System**: Users earn tokens for listening and engaging with music
- **Artist Discovery**: Advanced search and trending algorithms to discover new talent
- **Social Features**: Like, comment, and favorite systems to build artist-listener relationships
- **Personalized Experience**: Custom playlists and favorite artist tracking

#### 🤝 **Community-Driven Ecosystem**
- **Collaborative Creation**: Artists can collaborate on songs with shared ownership
- **Fan Engagement**: Comments, likes, and direct artist support mechanisms
- **Token-Based Economy**: Reward system encouraging active participation
- **Transparent Statistics**: Real-time analytics for artists and songs

## Technical Architecture

### Smart Contract System

Melody is built on three interconnected smart contracts deployed on Starknet:

#### 1. **Artist Contract** (`IArtistContract`)
Manages artist registration, song uploads, and collaboration features:
- Artist profile creation and management
- Song upload and metadata handling
- Collaboration system for multi-artist tracks
- Comprehensive artist statistics and analytics
  ![image](https://github.com/user-attachments/assets/6ad89cfa-f947-4087-8cb7-d3c042ed3e17)



#### 2. **Song Contract** (`ISongContract`)
Handles song interactions, engagement, and social features:
- Like and comment systems
- Song statistics and popularity tracking  
- User engagement rewards
- Pagination and batch operations for scalability
  ![image](https://github.com/user-attachments/assets/5a3978ce-58ef-4b03-92c6-bfc8d2aa11ce)

  

#### 3. **User Contract** (`IUserContract`)
Manages user profiles, rewards, and favorite artists:
- User registration and profile management
- Token-based reward system
- Artist favoriting and discovery
- User activity tracking
    ![image](https://github.com/user-attachments/assets/c6fb103c-5188-423b-972f-70baeb52239a)


### Technology Stack

- **Blockchain**: Starknet for scalable, low-cost transactions
- **Smart Contracts**: Cairo language for robust contract development
- **Architecture**: Modular design with separate concerns for scalability
- **Token System**: Native reward mechanism for user engagement

## Key Functionalities

### For Artists
```cairo
// Register as an artist
register_artist(artist_address, name, profile_data)

// Upload new songs
upload_song(artist_address, song_uri, metadata)

// Create collaborations
collab_song(artist1, artist2, song_uri, metadata)
```

### For Listeners
```cairo
// Engage with music
like_song(song_id, user_address)
comment_on_song(song_id, user_address, comment)

// Discover content  
get_trending_songs(count)
search_artists_by_name(name_prefix)

// Build favorites
favorite_artist(user_address, artist_address)
```

### Analytics & Discovery
- Real-time song and artist statistics
- Trending content algorithms
- Paginated data retrieval for performance
- Advanced search and filtering capabilities

## Getting Started

### Prerequisites
- Starknet wallet (ArgentX)
- Cairo development environment
- Node.js and npm/yarn



## Contract Addresses

### Testnet (Goerli)
- **Artist Contract**: `0x046ea4d5c26e7f39c6d695e71b2be42ba3707f93f2535d003349854b308ba6a91`
- **Song Contract**: `0x0712b407803cfcfaa3ea340a95e79e2a2f524882259629b74b90d3027e1986ab`
- **User Contract**: `0x05f3c117a2ffcee18a63c1253cadc11228c2f09c1dee8b1de6ca4a0b036be933`


## API Reference

### Artist Operations
- `register_artist()` - Register new artist profile
- `upload_song()` - Upload song with metadata
- `get_artist_profile()` - Retrieve artist information
- `get_artist_collaborations()` - Get collaboration history
  ![image](https://github.com/user-attachments/assets/972a4e3f-7b49-4ea7-a92c-88a5a1e2e0db)
  ![image](https://github.com/user-attachments/assets/88a1be05-2c30-43c5-8866-cbdb56ccc08c)
  ![image](https://github.com/user-attachments/assets/29230d02-5d66-4b3f-bd46-c1b259e79a25)
  ![image](https://github.com/user-attachments/assets/a4aa18a2-36b0-468d-824b-c9b169de11e4)


  


  

### Song Interactions  
- `like_song()` - Like a song
- `comment_on_song()` - Add comment to song
- `get_song_stats()` - Get comprehensive song statistics
- `get_trending_songs()` - Retrieve trending content
  ![image](https://github.com/user-attachments/assets/c9134c96-a6b8-475f-ae58-7e091a0d9ca4)
  ![image](https://github.com/user-attachments/assets/3043a5a8-3269-4419-b4b4-060e940481c6)

  


### User Functions
- `register_user()` - Create user profile
- `favorite_artist()` - Add artist to favorites
- `get_user_tokens()` - Check token balance
- `reward_user_for_listening()` - Earn listening rewards
  ![image](https://github.com/user-attachments/assets/898d3215-5ed6-4f2d-9146-fe941053f95c)
  ![image](https://github.com/user-attachments/assets/cc4e2630-5c4d-429d-bc27-3527f0ec64ab)






## Hackathon

**Melody** was developed for the **Starknet Reignite Hackathon**, showcasing the power of Cairo smart contracts and the Starknet ecosystem for decentralized application development.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


---

**Built with ❤️ on Starknet** | **Empowering Artists, Enriching Listeners** 🎵
