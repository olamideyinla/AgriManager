import DailyEntryHome from './DailyEntryHome'
import { usePageTitle } from '../../shared/hooks/usePageTitle'

export default function DailyEntryPage() {
  usePageTitle('Daily Entry')
  return <DailyEntryHome />
}
