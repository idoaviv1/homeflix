// Placeholder data until real library/TMDB integration
// These will be replaced by actual media from the database

const COLORS = [
  '#D4202C', '#1E40AF', '#7C3AED', '#059669', '#D97706',
  '#DB2777', '#0891B2', '#4F46E5', '#DC2626', '#16A34A',
  '#9333EA', '#0D9488', '#EA580C', '#2563EB', '#C026D3',
  '#65A30D',
];

const MOVIE_DATA = [
  { title: 'Quantum Drift', year: 2025, genres: ['Sci-Fi', 'Action'], runtime: '2h 14m', rating: 8.4 },
  { title: 'Midnight in Tokyo', year: 2024, genres: ['Drama', 'Romance'], runtime: '1h 52m', rating: 7.8 },
  { title: 'The Last Protocol', year: 2025, genres: ['Thriller', 'Mystery'], runtime: '2h 1m', rating: 8.1 },
  { title: 'Neon Shadows', year: 2024, genres: ['Action', 'Cyberpunk'], runtime: '1h 58m', rating: 7.5 },
  { title: 'Echoes of Tomorrow', year: 2025, genres: ['Sci-Fi', 'Drama'], runtime: '2h 22m', rating: 8.7 },
  { title: 'Desert Storm', year: 2024, genres: ['War', 'Action'], runtime: '2h 30m', rating: 7.9 },
  { title: 'Silent Waters', year: 2025, genres: ['Horror', 'Thriller'], runtime: '1h 44m', rating: 7.2 },
  { title: 'Crown of Ashes', year: 2024, genres: ['Fantasy', 'Adventure'], runtime: '2h 45m', rating: 8.3 },
  { title: 'Digital Ghosts', year: 2025, genres: ['Tech-Noir', 'Drama'], runtime: '1h 56m', rating: 7.6 },
  { title: 'Iron Verdict', year: 2024, genres: ['Legal', 'Thriller'], runtime: '2h 8m', rating: 8.0 },
  { title: 'Starbound', year: 2025, genres: ['Sci-Fi', 'Adventure'], runtime: '2h 35m', rating: 8.5 },
  { title: 'Crimson Tide', year: 2024, genres: ['Crime', 'Drama'], runtime: '2h 12m', rating: 7.7 },
  { title: 'The Architect', year: 2025, genres: ['Mystery', 'Drama'], runtime: '1h 48m', rating: 8.2 },
  { title: 'Parallel Lines', year: 2024, genres: ['Sci-Fi', 'Romance'], runtime: '1h 55m', rating: 7.4 },
  { title: 'Dark Meridian', year: 2025, genres: ['Action', 'Thriller'], runtime: '2h 5m', rating: 7.8 },
  { title: 'Ember & Frost', year: 2024, genres: ['Fantasy', 'Drama'], runtime: '2h 18m', rating: 8.6 },
];

export const PLACEHOLDER_MOVIES = MOVIE_DATA.map((movie, i) => ({
  id: `placeholder-${i}`,
  title: movie.title,
  year: movie.year,
  posterColor: COLORS[i % COLORS.length]!,
  rating: movie.rating,
  genres: movie.genres,
  runtime: movie.runtime,
}));
