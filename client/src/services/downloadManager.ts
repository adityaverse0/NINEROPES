class DownloadManager {
  /**
   * Opens the mirror download link directly in a clean new tab,
   * with fallbacks for popup-blocked mobile browsers.
   */
  public openMirror(url: string, name?: string): boolean {
    if (!url) {
      console.error('DownloadManager: No URL provided');
      return false;
    }

    try {
      // 1. Try window.open first
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win && !win.closed && typeof win.closed !== 'undefined') {
        console.log(`🌐 Opened mirror in new tab: ${name || url}`);
        return true;
      }

      // 2. Fallback: Synthetic anchor click (bypasses most strict mobile popup blockers)
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`🔗 Triggered native link navigation: ${name || url}`);
      return true;
    } catch (err) {
      console.error('Failed to open mirror link, falling back to direct navigation:', err);
      // 3. Fallback: direct window.location
      window.location.assign(url);
      return false;
    }
  }

  /**
   * Backward-compatible alias for openMirror
   */
  public triggerIframeDownload(url: string, filename?: string): boolean {
    return this.openMirror(url, filename);
  }

  /**
   * Copies URL to clipboard with fallback for non-secure contexts
   */
  public async copyLink(url: string): Promise<boolean> {
    if (!url) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('Failed to copy link:', err);
      return false;
    }
  }

  /**
   * Opens cloud or external stream link in a secure new tab
   */
  public openCloudLink(url: string): void {
    if (!url) return;
    this.openMirror(url, 'Cloud Storage');
  }

  /**
   * Generates a VLC/External player URL intent for mobile/desktop players
   */
  public openInExternalPlayer(url: string): void {
    if (!url) return;
    const vlcUrl = url.startsWith('http') ? `vlc://${url}` : url;
    window.location.href = vlcUrl;
  }
}

export const downloadManager = new DownloadManager();
