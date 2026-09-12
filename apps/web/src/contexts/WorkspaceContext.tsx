'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  members: { role: string }[];
  onboardingCompleted?: boolean;
  joinCode?: string;
  joinPassword?: string;
  standupWindowStart?: string;
  standupWindowEnd?: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (w: Workspace) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      // NOTE: Do NOT set isLoading=false here. isLoading starts as true.
      // The layout already handles the !user case (shows "Loading..." or redirects
      // to /login) before it ever checks isWorkspaceLoading. If we set false here,
      // there's a render frame after auth completes (user becomes non-null) but
      // before this effect re-runs where isLoading=false + workspaces=[] — causing
      // the "Welcome / no workspaces" screen to flash.
      return;
    }

    // Immediately mark as loading so we don't flash the "no workspaces" screen
    // between renders when user changes from null to a valid user.
    setIsLoading(true);

    const fetchWorkspaces = async () => {
      try {
        const res = await api.get('/workspaces');
        const data = res.data;
        setWorkspaces(data);
        if (data.length > 0) {
          // Default to first workspace, or could be stored in local storage
          const savedId = localStorage.getItem('activeWorkspaceId');
          const saved = savedId ? data.find((w: Workspace) => w.id === savedId) : null;
          setActiveWorkspaceState(saved || data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch workspaces', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user]);

  const setActiveWorkspace = (w: Workspace) => {
    setActiveWorkspaceState(w);
    localStorage.setItem('activeWorkspaceId', w.id);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
