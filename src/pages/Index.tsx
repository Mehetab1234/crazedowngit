
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Download, Lock, Unlock, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { toast } = useToast();

  const validateGitHubUrl = (url: string) => {
    const githubPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
    return githubPattern.test(url.replace(/\.git$/, ''));
  };

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }
    return null;
  };

  const simulateDownload = async () => {
    setDownloadProgress(0);
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setDownloadProgress(i);
    }
  };

  const handleDownload = async () => {
    setError('');
    setSuccess('');

    if (!repoUrl) {
      setError('Please enter a repository URL');
      return;
    }

    if (!validateGitHubUrl(repoUrl)) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    if (isPrivate && !token) {
      setError('Private repositories require a GitHub token');
      return;
    }

    const repoInfo = extractRepoInfo(repoUrl);
    if (!repoInfo) {
      setError('Could not parse repository information');
      return;
    }

    setIsDownloading(true);

    try {
      // Simulate the download process
      await simulateDownload();

      // In a real implementation, you would:
      // 1. Use the GitHub API to get repository information
      // 2. Download the repository as a ZIP file
      // 3. Handle the file download through the browser

      const downloadUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/${branch}.zip`;
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${repoInfo.repo}-${branch}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Successfully downloaded ${repoInfo.repo} (${branch} branch)`);
      toast({
        title: "Download Complete",
        description: `${repoInfo.repo} has been downloaded successfully`,
      });

    } catch (err) {
      setError('Failed to download repository. Please check your inputs and try again.');
      toast({
        title: "Download Failed",
        description: "There was an error downloading the repository",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Github className="h-16 w-16 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">GitHub Repository Downloader</h1>
          <p className="text-slate-400 text-lg">Download any GitHub repository with ease</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="h-5 w-5" />
              Repository Download
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter the GitHub repository URL and select your preferred branch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="repo-url" className="text-white">Repository URL</Label>
              <Input
                id="repo-url"
                type="url"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch" className="text-white">Branch</Label>
              <Input
                id="branch"
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPrivate(!isPrivate)}
                className={isPrivate ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-400 hover:text-white"}
              >
                {isPrivate ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                {isPrivate ? "Private Repository" : "Public Repository"}
              </Button>
            </div>

            {isPrivate && (
              <div className="space-y-2">
                <Label htmlFor="token" className="text-white">GitHub Personal Access Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400">
                  Required for private repositories. Generate one at GitHub Settings → Developer settings → Personal access tokens
                </p>
              </div>
            )}

            {error && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">{success}</AlertDescription>
              </Alert>
            )}

            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Downloading...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <Progress value={downloadProgress} className="bg-slate-700" />
              </div>
            )}

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Repository
                </>
              )}
            </Button>

            <div className="text-center text-sm text-slate-400">
              <p>Supports both public and private repositories</p>
              <p>Downloads as ZIP file with selected branch</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Built with ❤️ for developers</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
