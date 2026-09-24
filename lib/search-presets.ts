import type { ModeId } from './intent';

export const SEARCH_MODES: Record<ModeId, { label: string; hint: string; example: string }> = {
  general: { label: 'Search', hint: 'A little curiosity goes a long way.', example: 'why do cats purr' },
  weather: { label: 'Weather', hint: 'A forecast, shaped around your plans.', example: 'will I need an umbrella in Tokyo tomorrow' },
  finance: { label: 'Stocks', hint: 'Follow the company. Find the context.', example: 'AAPL stock performance' },
  places: { label: 'Places', hint: 'Somewhere worth going.', example: 'quiet cafes in Singapore' },
  movies: { label: 'Movies', hint: 'Find your next watch.', example: 'Dune Part Two showtimes' },
  convert: { label: 'Convert', hint: 'A different unit. The same idea.', example: '10 km in miles' },
  define: { label: 'Dictionary', hint: 'Find just the right meaning.', example: 'what does serendipity mean' },
  documents: { label: 'Documents', hint: 'The right information. In the right format.', example: 'climate change report filetype:pdf' },
  site: { label: 'Website', hint: 'One corner of the web.', example: 'design systems site:github.com' },
  news: { label: 'News', hint: 'Catch up on what is happening.', example: 'latest news about reusable rockets' },
  date: { label: 'Date range', hint: 'Put a little time around your search.', example: 'solar energy after:2024-01-01 before:2025-01-01' },
  precise: { label: 'Fine-tune', hint: 'A few details make all the difference.', example: '"jaguar speed" -car' },
};

export const EXAMPLES: ModeId[] = ['weather', 'convert', 'places', 'define', 'documents', 'finance', 'movies', 'site', 'news', 'date', 'precise', 'general'];
