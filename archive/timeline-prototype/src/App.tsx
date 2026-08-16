import { TimelineLayout } from './components/timeline-layout';
import { mockState } from './mocks/timeline-data';

const INITIAL_PPF = 10;

export function App() {
  return <TimelineLayout state={mockState} ppf={INITIAL_PPF} />;
}
