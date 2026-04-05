import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MobileShell } from '../shared/layouts/MobileShell'
import { ProtectedRoute, GuestRoute, AdminRoute } from '../shared/components/ProtectedRoute'
import { PartnerRoute } from '../shared/components/PartnerRoute'

// Admin pages
const AdminContactsPage     = lazy(() => import('../features/admin/AdminContactsPage'))
const AdminUsersPage        = lazy(() => import('../features/admin/AdminUsersPage'))
const AdminPartnersPage     = lazy(() => import('../features/admin/AdminPartnersPage'))
const AdminPartnerDetailPage= lazy(() => import('../features/admin/AdminPartnerDetailPage'))

// Partner pages (public + portal)
const LandingPartnersPage   = lazy(() => import('../features/partners/LandingPartnersPage'))
const PartnerApplyPage      = lazy(() => import('../features/partners/PartnerApplyPage'))
const PartnerSignInPage     = lazy(() => import('../features/partners/PartnerSignInPage'))
const PartnerPortalLayout   = lazy(() => import('../features/partners/portal/PartnerPortalLayout'))
const PartnerDashboardPage  = lazy(() => import('../features/partners/portal/PartnerDashboardPage'))
const PartnerReferralsPage  = lazy(() => import('../features/partners/portal/PartnerReferralsPage'))
const PartnerEarningsPage   = lazy(() => import('../features/partners/portal/PartnerEarningsPage'))
const PartnerToolkitPage    = lazy(() => import('../features/partners/portal/PartnerToolkitPage'))

// Landing pages (public)
const LandingPage  = lazy(() => import('../features/landing/LandingPage'))
const PrivacyPage  = lazy(() => import('../features/landing/PrivacyPage'))
const TermsPage    = lazy(() => import('../features/landing/TermsPage'))
const ContactPage  = lazy(() => import('../features/landing/ContactPage'))

// Auth pages (guest only)
const WelcomePage = lazy(() => import('../features/auth/pages/WelcomePage'))
const SignInPage = lazy(() => import('../features/auth/pages/SignInPage'))
const SignUpPage = lazy(() => import('../features/auth/pages/SignUpPage'))
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage'))
const AcceptInvitePage = lazy(() => import('../features/auth/pages/AcceptInvitePage'))

// Feature pages (auth required)
const FarmSetupPage = lazy(() => import('../features/farm-setup/FarmSetupPage'))
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const DailyEntryPage = lazy(() => import('../features/daily-entry/DailyEntryPage'))
const EntryFormDispatcher = lazy(() => import('../features/daily-entry/EntryFormDispatcher'))
const GridEntryScreen = lazy(() => import('../features/daily-entry/GridEntryScreen'))
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'))
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage'))
const MorePage = lazy(() => import('../features/settings/MorePage'))
const AlertsPage = lazy(() => import('../features/alerts/AlertsPage'))
const EnterprisesPage = lazy(() => import('../features/enterprises/EnterprisesPage'))
const EnterpriseDetailPage = lazy(() => import('../features/enterprises/EnterpriseDetailPage'))
const FinancialsPage = lazy(() => import('../features/financials/FinancialsPage'))

// Inventory sub-pages
const InventoryItemDetail  = lazy(() => import('../features/inventory/InventoryItemDetail'))
const ReceiveStockForm     = lazy(() => import('../features/inventory/forms/ReceiveStockForm'))
const IssueStockForm       = lazy(() => import('../features/inventory/forms/IssueStockForm'))
const StockAdjustmentForm  = lazy(() => import('../features/inventory/forms/StockAdjustmentForm'))

// Financials sub-pages
const AccountsReceivable   = lazy(() => import('../features/financials/AccountsReceivable'))
const RecordSaleForm       = lazy(() => import('../features/financials/forms/RecordSaleForm'))
const RecordExpenseForm    = lazy(() => import('../features/financials/forms/RecordExpenseForm'))

// Reports sub-pages
const ReportConfigPage     = lazy(() => import('../features/reports/ReportConfigPage'))
const ReportViewPage       = lazy(() => import('../features/reports/ReportViewPage'))

// Alerts sub-pages
const AlertSettingsPage    = lazy(() => import('../features/alerts/AlertSettingsPage'))

// Sync page
const SyncStatusPage       = lazy(() => import('../features/sync/SyncStatusPage'))

// Worker entry page
const WorkerEntryPage      = lazy(() => import('../features/daily-entry/WorkerEntryPage'))

// Team management (owner only)
const TeamPage             = lazy(() => import('../features/settings/team/TeamPage'))
const InviteMemberForm     = lazy(() => import('../features/settings/team/InviteMemberForm'))
const MemberDetailPage     = lazy(() => import('../features/settings/team/MemberDetailPage'))

// Activity log (owner/manager)
const ActivityLogPage      = lazy(() => import('../features/settings/ActivityLogPage'))

// Data management
const DataManagement       = lazy(() => import('../features/settings/DataManagement'))

// CSV farm setup import
const SetupImportWizard    = lazy(() => import('../features/import/SetupImportWizard'))

// Labor pages
const LaborHomePage        = lazy(() => import('../features/labor/LaborHomePage'))
const WorkerDetailPage     = lazy(() => import('../features/labor/WorkerDetailPage'))

// Worker task pages
const WorkerTasksPage      = lazy(() => import('../features/worker-tasks/WorkerTasksPage'))
const WorkerHistoryPage    = lazy(() => import('../features/worker-tasks/WorkerHistoryPage'))
const SupervisorTaskDashboard = lazy(() => import('../features/worker-tasks/SupervisorTaskDashboard'))

// Task & reminder settings pages
const TaskTemplatesPage    = lazy(() => import('../features/settings/task-templates/TaskTemplatesPage'))
const WorkerReminderSettings = lazy(() => import('../features/settings/WorkerReminderSettings'))

// Health pages
const HealthSchedulePage   = lazy(() => import('../features/health/HealthSchedulePage'))
const ProtocolManagement   = lazy(() => import('../features/health/ProtocolManagement'))

// Subscription pages
const SubscriptionPage         = lazy(() => import('../features/settings/SubscriptionPage'))
const SubscriptionPaymentPage  = lazy(() => import('../features/settings/SubscriptionPaymentPage'))

// Invoicing pages
const InvoicingPage        = lazy(() => import('../features/invoicing/InvoicingPage'))
const CreateInvoicePage    = lazy(() => import('../features/invoicing/CreateInvoicePage'))
const CreateReceiptPage    = lazy(() => import('../features/invoicing/CreateReceiptPage'))
const InvoiceDetailPage    = lazy(() => import('../features/invoicing/InvoiceDetailPage'))
const ReceiptDetailPage    = lazy(() => import('../features/invoicing/ReceiptDetailPage'))
const InvoiceSettingsPage  = lazy(() => import('../features/invoicing/InvoiceSettingsPage'))

// Payroll pages
const PayrollPage          = lazy(() => import('../features/payroll/PayrollPage'))
const PayrollSettingsPage  = lazy(() => import('../features/payroll/PayrollSettingsPage'))
const WorkerPayrollSetup   = lazy(() => import('../features/payroll/WorkerPayrollSetup'))
const RunPayrollFlow       = lazy(() => import('../features/payroll/RunPayrollFlow'))
const PayslipDetailPage    = lazy(() => import('../features/payroll/PayslipDetailPage'))

// Decision support tools
const DecisionToolsPage    = lazy(() => import('../features/decision-support/DecisionToolsPage'))
const BroilerSellCalculator= lazy(() => import('../features/decision-support/BroilerSellCalculator'))
const LayerDepletionAnalyzer=lazy(() => import('../features/decision-support/LayerDepletionAnalyzer'))
const BatchPlanner          = lazy(() => import('../features/decision-support/BatchPlanner'))
const BenchmarkTool         = lazy(() => import('../features/decision-support/BenchmarkTool'))
const PlanningCalendar      = lazy(() => import('../features/decision-support/PlanningCalendar'))

function LoadingScreen() {
  return (
    <div className="flex h-dvh items-center justify-center bg-primary-500">
      <div className="text-center text-white">
        <div className="text-4xl font-bold mb-2">🌾</div>
        <p className="text-sm opacity-80">Loading AgriManagerX…</p>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Admin */}
          <Route path="/admin"                element={<AdminRoute><AdminContactsPage /></AdminRoute>} />
          <Route path="/admin/users"          element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/partners"       element={<AdminRoute><AdminPartnersPage /></AdminRoute>} />
          <Route path="/admin/partners/:id"   element={<AdminRoute><AdminPartnerDetailPage /></AdminRoute>} />

          {/* Landing & public pages */}
          <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Partner public pages — no auth required */}
          <Route path="/partners"        element={<LandingPartnersPage />} />
          <Route path="/partners/apply"  element={<PartnerApplyPage />} />
          <Route path="/partners/signin" element={<PartnerSignInPage />} />

          {/* Partner portal — PartnerRoute guard, nested layout */}
          <Route path="/partners/portal" element={<PartnerRoute><PartnerPortalLayout /></PartnerRoute>}>
            <Route index              element={<PartnerDashboardPage />} />
            <Route path="referrals"   element={<PartnerReferralsPage />} />
            <Route path="earnings"    element={<PartnerEarningsPage />} />
            <Route path="toolkit"     element={<PartnerToolkitPage />} />
          </Route>

          {/* Auth routes — guest only */}
          <Route path="/auth/welcome" element={<GuestRoute><WelcomePage /></GuestRoute>} />
          <Route path="/auth/signin" element={<GuestRoute><SignInPage /></GuestRoute>} />
          <Route path="/auth/signup" element={<GuestRoute><SignUpPage /></GuestRoute>} />
          <Route path="/auth/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/auth/accept-invite" element={<GuestRoute><AcceptInvitePage /></GuestRoute>} />

          {/* Farm setup — auth required, outside shell */}
          <Route path="/farm-setup" element={<ProtectedRoute><FarmSetupPage /></ProtectedRoute>} />

          {/* Main app shell — auth required */}
          <Route element={<ProtectedRoute><MobileShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/daily-entry" element={<DailyEntryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/more" element={<MorePage />} />
          </Route>

          {/* Daily entry detail routes — outside shell */}
          <Route path="/daily-entry/grid" element={<ProtectedRoute><GridEntryScreen /></ProtectedRoute>} />
          <Route path="/daily-entry/:enterpriseId" element={<ProtectedRoute><EntryFormDispatcher /></ProtectedRoute>} />

          {/* Alerts — outside shell */}
          <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          <Route path="/alerts/settings" element={<ProtectedRoute><AlertSettingsPage /></ProtectedRoute>} />

          {/* Enterprises — outside shell */}
          <Route path="/enterprises" element={<ProtectedRoute><EnterprisesPage /></ProtectedRoute>} />
          <Route path="/enterprises/:id" element={<ProtectedRoute><EnterpriseDetailPage /></ProtectedRoute>} />

          {/* Financials — outside shell (specific before dynamic) */}
          <Route path="/financials" element={<ProtectedRoute><FinancialsPage /></ProtectedRoute>} />
          <Route path="/financials/sale" element={<ProtectedRoute><RecordSaleForm /></ProtectedRoute>} />
          <Route path="/financials/expense" element={<ProtectedRoute><RecordExpenseForm /></ProtectedRoute>} />
          <Route path="/financials/ar" element={<ProtectedRoute><AccountsReceivable /></ProtectedRoute>} />

          {/* Inventory — outside shell (specific before :id) */}
          <Route path="/inventory/receive" element={<ProtectedRoute><ReceiveStockForm /></ProtectedRoute>} />
          <Route path="/inventory/issue" element={<ProtectedRoute><IssueStockForm /></ProtectedRoute>} />
          <Route path="/inventory/adjust" element={<ProtectedRoute><StockAdjustmentForm /></ProtectedRoute>} />
          <Route path="/inventory/:id" element={<ProtectedRoute><InventoryItemDetail /></ProtectedRoute>} />

          {/* Reports — outside shell */}
          <Route path="/reports/config/:reportType" element={<ProtectedRoute><ReportConfigPage /></ProtectedRoute>} />
          <Route path="/reports/view" element={<ProtectedRoute><ReportViewPage /></ProtectedRoute>} />

          {/* Sync — outside shell */}
          <Route path="/sync" element={<ProtectedRoute><SyncStatusPage /></ProtectedRoute>} />

          {/* Worker entry — outside shell */}
          <Route path="/worker-entry" element={<ProtectedRoute><WorkerEntryPage /></ProtectedRoute>} />

          {/* Team management — outside shell */}
          <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/team/invite" element={<ProtectedRoute><InviteMemberForm /></ProtectedRoute>} />
          <Route path="/team/:userId" element={<ProtectedRoute><MemberDetailPage /></ProtectedRoute>} />

          {/* Activity log — outside shell */}
          <Route path="/settings/activity-log" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />

          {/* Data management — outside shell */}
          <Route path="/settings/data-management" element={<ProtectedRoute><DataManagement /></ProtectedRoute>} />

          {/* CSV farm setup import — owner only */}
          <Route path="/import/setup" element={<ProtectedRoute allowedRoles={['owner']}><SetupImportWizard /></ProtectedRoute>} />

          {/* Labor — outside shell */}
          <Route path="/labor" element={<ProtectedRoute><LaborHomePage /></ProtectedRoute>} />
          <Route path="/labor/worker/:id" element={<ProtectedRoute><WorkerDetailPage /></ProtectedRoute>} />

          {/* Worker tasks — outside shell */}
          <Route path="/worker/tasks"   element={<ProtectedRoute><WorkerTasksPage /></ProtectedRoute>} />
          <Route path="/worker/history" element={<ProtectedRoute><WorkerHistoryPage /></ProtectedRoute>} />

          {/* Supervisor task dashboard — outside shell */}
          <Route path="/team/tasks" element={<ProtectedRoute><SupervisorTaskDashboard /></ProtectedRoute>} />

          {/* Task templates & reminder settings — outside shell */}
          <Route path="/settings/task-templates" element={<ProtectedRoute><TaskTemplatesPage /></ProtectedRoute>} />
          <Route path="/settings/reminders"      element={<ProtectedRoute><WorkerReminderSettings /></ProtectedRoute>} />

          {/* Subscription — outside shell */}
          <Route path="/settings/subscription"         element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
          <Route path="/settings/subscription/payment" element={<ProtectedRoute><SubscriptionPaymentPage /></ProtectedRoute>} />

          {/* Health — outside shell (specific before dynamic) */}
          <Route path="/health/protocols" element={<ProtectedRoute><ProtocolManagement /></ProtectedRoute>} />
          <Route path="/health" element={<ProtectedRoute><HealthSchedulePage /></ProtectedRoute>} />

          {/* Invoicing — outside shell (specific before dynamic) */}
          <Route path="/invoicing"                    element={<ProtectedRoute><InvoicingPage /></ProtectedRoute>} />
          <Route path="/invoicing/create-invoice"     element={<ProtectedRoute><CreateInvoicePage /></ProtectedRoute>} />
          <Route path="/invoicing/create-receipt"     element={<ProtectedRoute><CreateReceiptPage /></ProtectedRoute>} />
          <Route path="/invoicing/settings"           element={<ProtectedRoute><InvoiceSettingsPage /></ProtectedRoute>} />
          <Route path="/invoicing/invoice/:id"        element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>} />
          <Route path="/invoicing/receipt/:id"        element={<ProtectedRoute><ReceiptDetailPage /></ProtectedRoute>} />

          {/* Payroll — outside shell (specific before dynamic) */}
          <Route path="/payroll"                  element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/payroll/settings"         element={<ProtectedRoute><PayrollSettingsPage /></ProtectedRoute>} />
          <Route path="/payroll/worker/:workerId" element={<ProtectedRoute><WorkerPayrollSetup /></ProtectedRoute>} />
          <Route path="/payroll/run"              element={<ProtectedRoute><RunPayrollFlow /></ProtectedRoute>} />
          <Route path="/payroll/run/:runId"       element={<ProtectedRoute><RunPayrollFlow /></ProtectedRoute>} />
          <Route path="/payroll/payslip/:payslipId" element={<ProtectedRoute><PayslipDetailPage /></ProtectedRoute>} />

          {/* Decision support tools — outside shell */}
          <Route path="/decision"                 element={<ProtectedRoute><DecisionToolsPage /></ProtectedRoute>} />
          <Route path="/decision/broiler-sell"    element={<ProtectedRoute><BroilerSellCalculator /></ProtectedRoute>} />
          <Route path="/decision/layer-depletion" element={<ProtectedRoute><LayerDepletionAnalyzer /></ProtectedRoute>} />
          <Route path="/decision/batch-planner"   element={<ProtectedRoute><BatchPlanner /></ProtectedRoute>} />
          <Route path="/decision/benchmark"       element={<ProtectedRoute><BenchmarkTool /></ProtectedRoute>} />
          <Route path="/decision/calendar"        element={<ProtectedRoute><PlanningCalendar /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
