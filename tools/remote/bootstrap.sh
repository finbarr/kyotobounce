#!/usr/bin/env bash
set -euo pipefail
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends python3-venv python3-pip xvfb xauth bubblewrap libxi6 libxrender1 libxfixes3 libxkbcommon0 libsm6 libgl1 libegl1 libgbm1 libnss3 libasound2t64 libxss1 libatk-bridge2.0-0 libgtk-3-0 libvulkan1 mesa-vulkan-drivers ffmpeg poppler-utils fonts-noto-cjk libimage-exiftool-perl unzip jq zstd ripgrep
sudo install -d -o boxhaven -g boxhaven /opt/boxhaven/kyoto-python /opt/boxhaven/downloads /opt/boxhaven/kyoto-tools
python3 -m venv /opt/boxhaven/kyoto-python
/opt/boxhaven/kyoto-python/bin/pip install 'numpy==2.2.6' 'scipy==1.15.3' 'shapely==2.1.1' 'pyproj==3.7.2' 'Pillow==11.2.1' 'requests==2.32.4' 'beautifulsoup4==4.13.4' 'opencv-python-headless==4.11.0.86'
mkdir -p /opt/boxhaven/downloads
cd /opt/boxhaven/downloads
curl -fL --retry 3 -o blender-5.2.1-linux-x64.tar.xz https://download.blender.org/release/Blender5.2/blender-5.2.1-linux-x64.tar.xz
curl -fL --retry 3 -o blender-5.2.1.sha256 https://download.blender.org/release/Blender5.2/blender-5.2.1.sha256
grep 'blender-5.2.1-linux-x64.tar.xz$' blender-5.2.1.sha256 | sha256sum -c -
tar -xf blender-5.2.1-linux-x64.tar.xz -C /opt/boxhaven/kyoto-tools
sudo ln -sf /opt/boxhaven/kyoto-tools/blender-5.2.1-linux-x64/blender /usr/local/bin/blender
curl -fL --retry 3 -o google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt-get install -y ./google-chrome.deb
sudo tee /etc/profile.d/kyoto-tools.sh >/dev/null <<'EOF'
export PATH="/opt/boxhaven/kyoto-python/bin:$PATH"
export CHROME_PATH=/usr/bin/google-chrome
export KYOTO_WORKER_EXECUTABLE=/opt/boxhaven/project/Builds/PhysicsWorkerLinux/KyotoPhysicsWorker.x86_64
EOF
blender --version | head -3
google-chrome --version
/opt/boxhaven/kyoto-python/bin/python -c 'import numpy, scipy, shapely, pyproj, PIL, cv2; print("Python art and fitting modules ready")'
# Keep recorded source paths readable without rewriting their provenance hashes.
sudo mkdir -p /Users/finbarr/.codex/worktrees/performance-audit /Users/finbarr/code/games
for legacy in /Users/finbarr/.codex/worktrees/performance-audit/kyoto /Users/finbarr/code/games/kyoto; do
  if [ -L "$legacy" ]; then
    test "$(readlink "$legacy")" = /opt/boxhaven/project
  elif [ ! -e "$legacy" ]; then
    sudo ln -s /opt/boxhaven/project "$legacy"
  else
    echo "Unexpected existing legacy project path: $legacy" >&2; exit 1
  fi
done
