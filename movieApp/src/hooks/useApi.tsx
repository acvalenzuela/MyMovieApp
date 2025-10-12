// useApi.tsx file to acompany movie app.
// Kindly follow this video for details https://youtu.be/xn-qpnT2n3Q?t=660
// Custom hook to interact with the OMDb API

// Typescript custom enum for search types (optional)
export enum SearchType {
  all = "",
  movie = "movie",
  series = "series",
  episode = "episode",
}
// Interface for search result items
export interface SearchResult {
  Title: string;
  Year: string;
  Poster: string;
  imdbID: string;
  Type: string;
}
// Interface for search error response
export interface SearchError {
  Response: string;
  Error: string;
}
// Interface for detailed movie information
// Interface for detailed movie information
export interface DetailsResult {
  imdbRating: ReactNode;
  Genre: string;
  Title: string;
  Year: string;
  Poster: string;
  Plot: string;
  imdbID: string;
  Director: string;
  Actors: string;
  Website: string;
  Awards: string;
}

// Custom hook to interact with the OMDb API
export const useApi = () => {
  const url = "https://www.omdbapi.com/";
  const apiKey = "fc34634b"; // Replace with your actual API key
  // You can get a free API key from http://www.omdbapi.com/apikey.aspx
  // Function to search for movies, series, or episodes by title and type
  const searchData = async (
    title: string,
    type: SearchType
  ): Promise<SearchResult[] | SearchError> => {
    const result = await fetch(
      `${url}?s=${encodeURI(title)}&type=${type}&apikey=${apiKey}`
    );

    return result.json();
  };
  // Function to get detailed information about a specific movie, series, or episode by IMDb ID
  const getDetails = async (id: string): Promise<DetailsResult> => {
    const result = await fetch(`${url}?i=${id}&plot=full&apikey=${apiKey}`);
    return result.json();
  };
  // Return the functions to be used in components
  return {
    searchData,
    getDetails,
  };
};

export default useApi;