'use client';

import styles from './DashboardMockup.module.css';
import { 
  Check,
  Clock, 
  AlertTriangle,
  Bot,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Users,
  History,
  TrendingUp,
  Sparkles,
  Settings,
  CreditCard,
  Bell,
  Plus,
  LogIn
} from 'lucide-react';

export function DashboardMockup() {
  return (
    <div className={styles.wrapper}>
      {/* macOS Browser Window Frame */}
      <div className={styles.browserWindow}>
        {/* Browser Top Navigation Header */}
        <div className={styles.browserHeader}>
          <div className={styles.windowControls} aria-hidden="true">
            <span className={`${styles.dot} ${styles.dotRed}`} />
            <span className={`${styles.dot} ${styles.dotYellow}`} />
            <span className={`${styles.dot} ${styles.dotGreen}`} />
          </div>
          <div className={styles.addressBar}>
            <span className={styles.addressText}>aistandup.app</span>
          </div>
          <div className={styles.headerSpacer} aria-hidden="true" />
        </div>

        {/* Dashboard Content */}
        <div className={styles.dashboardContainer}>
          {/* Left Mini Sidebar */}
          <aside className={styles.miniSidebar} aria-hidden="true">
            <div className={styles.sidebarTop}>
              <ChevronRight size={13} className={styles.sidebarToggle} />
              <div className={styles.workspaceAvatar}>T</div>
            </div>
            <nav className={styles.sidebarNav}>
              <div className={`${styles.navItem} ${styles.navItemActive}`}>
                <LayoutDashboard size={15} />
              </div>
              <div className={styles.navItem}>
                <ClipboardList size={15} />
              </div>
              <div className={styles.navItem}>
                <Users size={15} />
              </div>
              <div className={styles.navItem}>
                <History size={15} />
              </div>
              <div className={styles.navItem}>
                <TrendingUp size={15} />
              </div>
              <div className={styles.navItem}>
                <Sparkles size={15} />
              </div>
              <div className={styles.navItem}>
                <Clock size={15} />
              </div>
            </nav>
            <div className={styles.sidebarBottom}>
              <div className={styles.navItem}>
                <Plus size={15} />
              </div>
              <div className={styles.navItem}>
                <LogIn size={15} />
              </div>
              <div className={styles.navItem}>
                <Settings size={15} />
              </div>
              <div className={styles.navItem}>
                <CreditCard size={15} />
              </div>
            </div>
          </aside>

          {/* Main Dashboard Canvas */}
          <div className={styles.dashboardMain}>
            {/* Dashboard Header Bar */}
            <div className={styles.dashHeader}>
              <div className={styles.dashHeaderLeft}>
                <h2 className={styles.dashTitle}>Dashboard</h2>
                <span className={styles.dashWorkspaceName}>Platform Engineering</span>
              </div>
              <div className={styles.dashHeaderRight}>
                <div className={styles.notificationBell}>
                  <Bell size={14} />
                </div>
                <div className={styles.submitStandupBtn}>
                  <Plus size={13} />
                  <span>Submit Standup</span>
                </div>
              </div>
            </div>

            {/* 4 Compact Stat Cards Row */}
            <div className={styles.statsStrip}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Submission Rate</span>
                <span className={styles.statValue}>100%</span>
                <span className={styles.statSub}>4 of 4 submitted</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Team Members</span>
                <span className={styles.statValue}>4</span>
                <span className={styles.statSub}>Active in workspace</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Active Blockers</span>
                <span className={`${styles.statValue} ${styles.statValueError}`}>1</span>
                <span className={styles.statSub}>Needs team attention</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Standup Window</span>
                <div className={styles.windowStatusPill}>
                  <span>Open</span>
                </div>
                <span className={styles.statSub}>4h 10m remaining</span>
              </div>
            </div>

            {/* 2-Column Content Grid */}
            <div className={styles.dashboardGrid}>
              {/* Left Column: Active Blocker + Team Presence */}
              <div className={styles.dashboardColumn}>
                {/* Active Blocker Alert Box */}
                <div className={styles.blockerAlert}>
                  <div className={styles.blockerAlertHeader}>
                    <AlertTriangle size={13} className={styles.blockerIcon} />
                    <span>Active Blockers (1)</span>
                  </div>
                  <div className={styles.blockerContent}>
                    <div className={styles.blockerMeta}>
                      <strong>Mr.Han</strong>
                      <span className={styles.sevHighBadge}>High</span>
                    </div>
                    <p className={styles.blockerText}>
                      Waiting for aws staging access from devops
                    </p>
                  </div>
                </div>

                {/* Team Presence Section */}
                <div className={styles.presenceSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionHeading}>Team Presence</h3>
                    <div className={styles.liveBadge}>
                      <span>Live</span>
                    </div>
                  </div>

                  {/* Today's Participation Bar */}
                  <div className={styles.participationCard}>
                    <div className={styles.participationRow}>
                      <span>Today&apos;s Participation</span>
                      <strong>4/4</strong>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Members List */}
                  <div className={styles.memberList}>
                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>AC</div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>Alex Chen</span>
                        <span className={styles.memberTime}>09:14</span>
                      </div>
                      <span className={`${styles.statusChip} ${styles.statusSubmitted}`}>
                        <Check size={13} strokeWidth={2.8} /> Submitted
                      </span>
                    </div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>SJ</div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>Sara Jenkins</span>
                        <span className={styles.memberTime}>09:42</span>
                      </div>
                      <span className={`${styles.statusChip} ${styles.statusSubmitted}`}>
                        <Check size={13} strokeWidth={2.8} /> Submitted
                      </span>
                    </div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>DK</div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>David Kim</span>
                        <span className={styles.memberTime}>10:15</span>
                      </div>
                      <span className={`${styles.statusChip} ${styles.statusSubmitted}`}>
                        <Check size={13} strokeWidth={2.8} /> Submitted
                      </span>
                    </div>

                    <div className={styles.memberRow}>
                      <div className={styles.memberAvatar}>MV</div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>Marcus Vance</span>
                        <span className={styles.memberTime}>11:18</span>
                      </div>
                      <span className={`${styles.statusChip} ${styles.statusLate}`}>
                        <Clock size={11} /> Late
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Summary + Recent Submissions */}
              <div className={styles.dashboardColumn}>
                {/* AI Summary Card */}
                <div className={styles.aiSummarySection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionHeading}>AI Summary</h3>
                  </div>
                  <div className={styles.aiSummaryCard}>
                    <div className={styles.aiBriefingBadge}>
                      <Bot size={13} />
                      <span>Claude AI Briefing</span>
                    </div>
                    <p className={styles.aiSummaryText}>
                      Team completed database index tuning and WebSocket event verification. Marcus and Sara finalized PR reviews for the billing module.
                    </p>
                  </div>
                </div>

                {/* Recent Submissions Feed */}
                <div className={styles.recentSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionHeading}>Recent Submissions</h3>
                  </div>
                  <div className={styles.submissionCard}>
                    <div className={styles.submissionHeader}>
                      <div className={styles.memberAvatarSmall}>M</div>
                      <div>
                        <div className={styles.submissionAuthor}>Mr.Han</div>
                        <div className={styles.submissionTime}>17:09</div>
                      </div>
                    </div>
                    <div className={styles.submissionBody}>
                      <p><strong>Yesterday:</strong> What did you do yesterday?</p>
                      <p><strong>Today:</strong> What will you do today</p>
                      <p className={styles.submissionBlocker}><strong>Blocker:</strong> Waiting for aws staging access from devops</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
