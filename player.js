; // SPDX-FileCopyrightText: 2021 Gary Wang <toblumia@outlook.com>
; // SPDX-License-Identifier: MIT
; // szO Chris && 2jjy && jxpxxzj Orz
; //     ↑ Moe    ↑ Moe   ↑ Moe

// formatTime,getCookie by Chrissssss
function formatTime(t) {
    if(isNaN(t))return '--:--';
    let m=Math.floor(t/60),s=Math.round(t-Math.floor(t/60)*60);
    if(s<10)return `${m}:0${s}`;
    else if(s==60)return `${m+1}:00`;
    else return `${m}:${s}`;
}
function getCookie(key) {
    if (!navigator.cookieEnabled) return "";
    return document.cookie.replace(new RegExp('(?:(?:^|.*;\\s*)'+key+'\\s*\\=\\s*([^;]*).*$)|^.*$'),'$1');
}
function setCookie(cookieName, cookieValue, maxAge = 0) {
    if (!navigator.cookieEnabled) return;
    var cookieStr = cookieName + "=" + cookieValue;
    if (maxAge > 0) cookieStr += ";max-age=" + maxAge;
    document.cookie = cookieStr;
}
function safeDecode(text) {
    if (!text) return "";
    try {
        return decodeURIComponent(text);
    } catch (e) {
        return text;
    }
}
function displayName(item) {
    if (!item) return "";
    return item.displayName ? item.displayName : safeDecode(item.fileName || item.path || "");
}
function trackTitle(item) {
    var title = displayName(item);
    return title.replace(/\.(mp3|flac|wav|ogg|opus|m4a|aac)$/i, "");
}
function trimTrailingSlash(path) {
    return (path || "").replace(/\/+$/, "");
}
function ensureTrailingSlash(path) {
    path = path || "";
    return path && !path.endsWith("/") ? path + "/" : path;
}
function normalizeFolder(item) {
    if (typeof item == "string") {
        var cleanPath = trimTrailingSlash(item);
        var parts = cleanPath.split("/").filter(Boolean);
        var encodedName = parts.length ? parts[parts.length - 1] : cleanPath;
        return {
            path: cleanPath,
            fileName: encodedName,
            displayName: safeDecode(encodedName),
            modifiedTime: 0
        };
    }
    item = item || {};
    var path = trimTrailingSlash(item.path || item.fileName || "");
    var pathParts = path.split("/").filter(Boolean);
    var fallbackName = pathParts.length ? pathParts[pathParts.length - 1] : path;
    return {
        path: path,
        fileName: item.fileName || fallbackName,
        displayName: item.displayName || safeDecode(item.fileName || fallbackName),
        modifiedTime: Number(item.modifiedTime || 0)
    };
}
function formatPath(path) {
    var cleanPath = trimTrailingSlash(path);
    if (!cleanPath) return "Library";
    return safeDecode(cleanPath).replace(/\//g, " / ");
}
function leafPath(path) {
    var cleanPath = trimTrailingSlash(path);
    if (!cleanPath) return "Library";
    var parts = cleanPath.split("/").filter(Boolean);
    return parts.length ? safeDecode(parts[parts.length - 1]) : "Library";
}
function parentPath(path) {
    var parts = trimTrailingSlash(path).split("/").filter(Boolean);
    parts.pop();
    return parts.length ? parts.join("/") + "/" : "";
}
function sameMediaPath(a, b) {
    return trimTrailingSlash(safeDecode(a || "")) == trimTrailingSlash(safeDecode(b || ""));
}
function formatSampleRate(sampleRate) {
    sampleRate = Number(sampleRate);
    if (!sampleRate) return "";
    var khz = sampleRate / 1000;
    return (Number.isInteger(khz) ? khz.toFixed(0) : khz.toFixed(1)) + " kHz";
}
function formatBitRate(bitRate) {
    bitRate = Number(bitRate);
    if (!bitRate) return "";
    return Math.round(bitRate / 1000) + " kbps";
}
function formatFileSize(bytes) {
    bytes = Number(bytes);
    if (!bytes) return "";
    var units = ["B", "KB", "MB", "GB"];
    var idx = 0;
    while (bytes >= 1024 && idx < units.length - 1) {
        bytes = bytes / 1024;
        idx++;
    }
    return (idx == 0 ? bytes.toFixed(0) : bytes.toFixed(1)) + " " + units[idx];
}
function getFileExtension(fileName) {
    fileName = safeDecode(fileName || "");
    var index = fileName.lastIndexOf(".");
    return index >= 0 ? fileName.substring(index + 1).toUpperCase() : "";
}
function fallbackAudioInfo(item) {
    return {
        format: (item && (item.extension || getFileExtension(item.fileName))) || "AUDIO"
    };
}
function getAudioInfo(item) {
    return item && item.audioInfo ? item.audioInfo : fallbackAudioInfo(item);
}
function qualityTier(info) {
    if (!info) return "unknown";
    var format = (info.format || "").toUpperCase();
    var sampleRate = Number(info.sampleRate || 0);
    var bits = Number(info.bitsPerSample || 0);
    if ((bits >= 24 && sampleRate >= 44100) || sampleRate > 48000) return "hires";
    if (bits == 16 && sampleRate == 44100) return "cd";
    if (["MP3", "AAC", "M4A", "OGG", "OPUS"].indexOf(format) >= 0) return "lossy";
    return sampleRate || bits ? "lossless" : "unknown";
}
function qualityBadge(info) {
    var tier = qualityTier(info);
    if (tier == "hires") return "Hi-RES";
    if (tier == "cd") return "CD QUALITY";
    if (tier == "lossy") return (info.format || "LOSSY").toUpperCase();
    return (info && info.format ? info.format : "AUDIO").toUpperCase();
}
function qualityDetails(info) {
    if (!info) return "Audio quality unavailable";
    var pieces = [];
    var format = info.format ? info.format.toUpperCase() : "";
    if (format && qualityBadge(info) != format) pieces.push(format);
    if (info.bitsPerSample) pieces.push(info.bitsPerSample + "-bit");
    if (info.sampleRate) pieces.push(formatSampleRate(info.sampleRate));
    if (info.bitRate) pieces.push(formatBitRate(info.bitRate));
    if (info.channels) pieces.push(info.channels == 1 ? "Mono" : info.channels + " ch");
    return pieces.length ? pieces.join(" / ") : "Audio quality unavailable";
}
function qualityShort(info) {
    if (!info) return "Unknown";
    var badge = qualityBadge(info);
    var sampleRate = formatSampleRate(info.sampleRate);
    var bitRate = formatBitRate(info.bitRate);
    if (qualityTier(info) == "hires" && sampleRate) return badge + " / " + sampleRate;
    if (sampleRate) return badge + " / " + sampleRate;
    if (bitRate) return badge + " / " + bitRate;
    return badge;
}
function trackMeta(item, currentPath) {
    var pieces = [];
    if (item && item.folder !== undefined) pieces.push(formatPath(item.folder));
    if (item && item.fileSize) pieces.push(formatFileSize(item.fileSize));
    var info = getAudioInfo(item);
    if (info && info.duration) pieces.push(formatTime(info.duration));
    if (!pieces.length && currentPath) pieces.push(formatPath(currentPath));
    return pieces.join(" / ");
}
function coverUrlForItem(item) {
    return item && item.coverUrl ? item.coverUrl : "";
}
function plural(count, single, multi) {
    return count + " " + (count == 1 ? single : multi);
}
function controlIcon(name) {
    if (name == "play") {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="solid-icon" d="M7.8 4.1v15.8L20.1 12z"></path></svg>';
    }
    if (name == "pause") {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect class="pause-bar" x="5.6" y="4.2" width="5.2" height="15.6" rx="1.35"></rect><rect class="pause-bar" x="12.6" y="4.2" width="5.2" height="15.6" rx="1.35"></rect></svg>';
    }
    if (name == "previous") {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="solid-icon" d="M5.2 6h2.4v12H5.2z"></path><path class="solid-icon" d="M18.8 5.5v13L8.6 12z"></path></svg>';
    }
    if (name == "next") {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="solid-icon" d="M16.4 6h2.4v12h-2.4z"></path><path class="solid-icon" d="M5.2 5.5v13L15.4 12z"></path></svg>';
    }
    if (name == "list") {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>';
    }
    if (name == "repeatOne") {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 2l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><text x="12" y="15" text-anchor="middle" font-size="8" font-weight="800" fill="currentColor" stroke="none">1</text></svg>';
    }
    return "";
}

(function() {
    var Helper = function() {
        this.el = null;
        this.entry = function(selector) {
            if (typeof selector == 'string') {
                if (selector[0] == '<') {
                    var singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/;
                    if (singleTagRE.test(selector)) this.el = document.createElement(RegExp.$1);
                } else {
                    this.el = document.getElementById(selector);
                }
            }
            else this.el = selector;
            return this;
        }
    }
    Helper.prototype = {
        css: function(property, value) {
            if(this.el) this.el.style.cssText += ';' + property + ":" + value;
            return this;
        },
        attr: function(attr, value) {
            if(this.el) this.el.setAttribute(attr, value);
            return this;
        },
        removeData: function(attr) {
            if(this.el) this.el.removeAttribute("data-" + attr);
            return this;
        },
        data: function(attr, value) {
            if(this.el) this.el.setAttribute("data-" + attr, JSON.stringify(value));
            return this;
        },
        append: function(node) {
            if(this.el) this.el.appendChild(node);
            return this;
        },
        text: function(content) {
            if(this.el) this.el.textContent = content;
            return this;
        },
        click: function(handler) {
            if(!this.el) return this;
            if (typeof(handler) == "function") this.el.onclick = handler;
            else this.el.click();
            return this;
        },
        innerHTML: function(text) {
            if(this.el) this.el.innerHTML = text;
            return this;
        }
    }
    var H = function(selector) {
        var f = new Helper();
        return f.entry(selector);
    }
    function TrickOrTreat(promiseRsp) {
        if (!promiseRsp.ok) {
            throw Error(promiseRsp.statusText);
        }
        return promiseRsp.json();
    }
    var Player = {
        mediaRootUrl: '',
        path: null,
        data: [],
        rootFolders: [],
        subFolders: [],
        preferredFormats: undefined,
        audio: document.getElementsByTagName('audio')[0],
        currentIndex: -1,
        loop: 0,
        order: 0,
        folderSort: getCookie("pcm-folder-sort") || "name-asc",
        isSearching: false,
        searchQuery: "",
        searchTimer: null,
        currentCoverUrl: "",
        playlist: H("playlist").el,
        folderlist: H("folderlist").el,
        nowPlaying: H("nowPlaying").el,
        apiUrl: "./api.php",
        _urlSongPath: "",
        _currentSongInfoJson: undefined,
        _chapterNeedUpdate: true,

        setInfoJson: function(jsonData) {
            this._currentSongInfoJson = jsonData;
            this._chapterNeedUpdate = true;
        },

        renderAlbumArt: function(item) {
            var that = this;
            var title = item ? trackTitle(item) : "Web Cloud Music";
            var meta = item ? (trackMeta(item, this.path) || formatPath(this.path)) : "Choose a track to begin";
            var coverUrl = coverUrlForItem(item);
            var button = H("playerArtButton").el;
            var image = H("playerArtImage").el;
            var modalImage = H("artModalImage").el;
            H("artModalTitle").text(item ? title : "Not playing at all.");
            H("artModalMeta").text(meta);
            this.currentCoverUrl = coverUrl;

            if (!button || !image) return;
            button.classList.remove("has-cover");
            button.setAttribute("aria-disabled", coverUrl ? "false" : "true");
            button.title = coverUrl ? "Open album art" : "Album art unavailable";
            button.setAttribute("aria-label", coverUrl ? "Open album art" : "Album art unavailable");
            image.alt = title;
            image.onload = function() {
                if (that.currentCoverUrl != coverUrl) return;
                button.classList.add("has-cover");
                if (modalImage) {
                    modalImage.alt = title;
                    modalImage.src = coverUrl;
                }
            };
            image.onerror = function() {
                if (that.currentCoverUrl != coverUrl) return;
                that.currentCoverUrl = "";
                button.classList.remove("has-cover");
                button.setAttribute("aria-disabled", "true");
                button.title = "Album art unavailable";
                button.setAttribute("aria-label", "Album art unavailable");
                image.removeAttribute("src");
                if (modalImage) modalImage.removeAttribute("src");
                that.closeAlbumArt();
            };

            if (coverUrl) {
                image.src = coverUrl;
            } else {
                image.removeAttribute("src");
                if (modalImage) modalImage.removeAttribute("src");
                this.closeAlbumArt();
            }
            this.syncFullscreenTransport();
        },

        syncFullscreenTransport: function() {
            var playHtml = this.audio && !this.audio.paused ? controlIcon("pause") : controlIcon("play");
            var playLabel = this.audio && !this.audio.paused ? "Pause" : "Play";
            H("fullBtnPlay").innerHTML(playHtml);
            H("fullBtnPlay").attr("aria-label", playLabel);
            H("fullBtnPlay").attr("title", playLabel);
            H("fullCurTime").text(formatTime(this.audio.currentTime));
            H("fullTotalTime").text(formatTime(this.audio.duration));
            this.updateFullscreenProgress();
        },

        updateFullscreenProgress: function() {
            var duration = this.audio.duration || 0;
            var progress = duration ? this.audio.currentTime / duration * 100 : 0;
            var buffered = 0;
            for (var i=0; i<this.audio.buffered.length; ++i) {
                buffered = buffered<this.audio.buffered.end(i) ? this.audio.buffered.end(i) : buffered;
            }
            var bufferedProgress = duration ? buffered / duration * 100 : 0;
            var fill = H("fullProgressFill").el;
            var buffer = H("fullProgressBuffer").el;
            if (fill) fill.style.width = Math.max(0, Math.min(100, progress)) + "%";
            if (buffer) buffer.style.width = Math.max(0, Math.min(100, bufferedProgress)) + "%";
        },

        openAlbumArt: function() {
            if (!this.currentCoverUrl) return;
            var modal = H("artModal").el;
            if (!modal) return;
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            document.body.classList.add("art-modal-open");
            this.syncFullscreenTransport();
        },

        closeAlbumArt: function() {
            var modal = H("artModal").el;
            if (!modal) return;
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            document.body.classList.remove("art-modal-open");
        },

        updateMetadata: function() {
            if ('mediaSession' in navigator) {
                var metadata = {
                    title: this.nowPlaying.textContent,
                    album: formatPath(this.path)
                };
                if (this.currentCoverUrl) {
                    metadata.artwork = [{ src: this.currentCoverUrl, sizes: "512x512" }];
                }
                window.navigator.mediaSession.metadata = new MediaMetadata(metadata);
            }
        },

        applyChapterData: function() {
            if (!this._chapterNeedUpdate) return;
            if (this.audio.duration) {
                if (this._currentSongInfoJson && Array.isArray(this._currentSongInfoJson.chapters)) {
                    let duration = this.audio.duration;
                    let progressChapterData = [];
                    this._currentSongInfoJson.chapters.forEach((chapter) => {
                        let chapterObj = {};
                        chapterObj.start = chapter.start_time / duration * 100;
                        chapterObj.title = chapter.title;
                        progressChapterData.push(chapterObj);
                    });
                    H("progress-bar").data("chapters", progressChapterData);
                } else {
                    H("progress-bar").removeData("chapters");
                }
                this._chapterNeedUpdate = false;
            }
        },

        fetchAdditionalInfo: function(infoJsonfileUrl) {
            var that = this;
            fetch(infoJsonfileUrl).then(TrickOrTreat).then((data) => {
                that.setInfoJson(data);
            });
        },

        sortFolders: function(list) {
            var sorted = list.slice();
            sorted.sort((a, b) => {
                if (this.folderSort == "time-desc") return Number(b.modifiedTime || 0) - Number(a.modifiedTime || 0);
                if (this.folderSort == "time-asc") return Number(a.modifiedTime || 0) - Number(b.modifiedTime || 0);
                var result = displayName(a).localeCompare(displayName(b), undefined, {numeric: true, sensitivity: "base"});
                return this.folderSort == "name-desc" ? -result : result;
            });
            return sorted;
        },

        renderFolderList: function() {
            var that = this;
            var activePath = ensureTrailingSlash(this.path);
            this.folderlist.innerHTML = "";
            var folders = this.sortFolders(this.rootFolders);
            if (!folders.length) {
                this.folderlist.appendChild(this.emptyNode("No folders found"));
                return;
            }
            folders.forEach(function(item) {
                var folderPath = ensureTrailingSlash(item.path);
                var row = document.createElement("li");
                var button = document.createElement("button");
                button.type = "button";
                button.className = "folder-button";
                if (folderPath && activePath.indexOf(folderPath) == 0) button.classList.add("is-active");
                button.setAttribute("data-aim", item.path);
                button.title = displayName(item);

                var name = document.createElement("span");
                name.className = "folder-name";
                name.textContent = displayName(item);

                var meta = document.createElement("span");
                meta.className = "folder-meta";
                meta.textContent = "Open";

                button.appendChild(name);
                button.appendChild(meta);
                row.appendChild(button);
                that.folderlist.appendChild(row);
            });

            document.querySelectorAll('#folderlist button').forEach(function(el) {
                el.onclick = function() {
                    that.path = ensureTrailingSlash(this.getAttribute('data-aim'));
                    that.clearSearchState();
                    that.fetchData();
                    if (typeof w3_close == "function") w3_close();
                };
            });
        },

        getPlaybackPath: function(item) {
            var itemFolder = item && item.folder !== undefined ? item.folder : this.path;
            return ensureTrailingSlash(itemFolder) + item.fileName;
        },

        syncCurrentTrackFromUrl: function() {
            if (!this._urlSongPath || !this.data || !this.data.length) return;
            for (var i = 0; i < this.data.length; i++) {
                if (sameMediaPath(this.getPlaybackPath(this.data[i]), this._urlSongPath)) {
                    this.currentIndex = i;
                    H(this.nowPlaying).text(trackTitle(this.data[i]));
                    H("playerMeta").text(trackMeta(this.data[i], this.path) || formatPath(this.path));
                    this.renderAudioQuality(getAudioInfo(this.data[i]));
                    this.renderAlbumArt(this.data[i]);
                    this.highlightActiveTrack();
                    return;
                }
            }
        },

        playAtIndex: function(i) {
            i = Number(i);
            if (!this.data || !this.data[i]) return;
            let item = this.data[i];
            let fullPath = this.getPlaybackPath(item);
            let srcUrl = item.url ? item.url : (this.mediaRootUrl + fullPath);
            this.audio.pause();
            this.currentIndex = i;
            this.audio.src = srcUrl;
            this.audio.load();
            let playPromise = this.audio.play();
            if (playPromise) playPromise.catch((reason) => { console.log(reason); });
            window.history.replaceState("","Useless Title","#/" + fullPath + "/");
            H(this.nowPlaying).text(trackTitle(item));
            H("playerMeta").text(trackMeta(item, this.path) || formatPath(this.path));
            this.renderAudioQuality(getAudioInfo(item));
            this.renderAlbumArt(item);
            this.highlightActiveTrack();

            if (item.additionalInfo) {
                let infoJsonFile = (fullPath.substring(0, fullPath.lastIndexOf('.')) || fullPath) + ".info.json";
                this.fetchAdditionalInfo(infoJsonFile);
            } else {
                this.setInfoJson(undefined);
            }
        },

        renderAudioQuality: function(info) {
            var badge = H("qualityBadge").el;
            var details = H("qualityDetails").el;
            var fullBadge = H("artModalQualityBadge").el;
            var fullDetails = H("artModalQualityDetails").el;
            var tier = qualityTier(info);
            var badgeText = info ? qualityBadge(info) : "--";
            var detailsText = info ? qualityDetails(info) : "Audio quality unavailable";
            if (info && (tier == "hires" || tier == "cd")) {
                document.body.dataset.playerQuality = tier;
            } else {
                document.body.dataset.playerQuality = "lossy";
            }
            if (badge && details) {
                badge.dataset.tier = tier;
                badge.textContent = badgeText;
                details.textContent = detailsText;
            }
            if (fullBadge && fullDetails) {
                fullBadge.dataset.tier = tier;
                fullBadge.textContent = badgeText;
                fullDetails.textContent = detailsText;
            }
        },

        highlightActiveTrack: function() {
            var that = this;
            document.querySelectorAll("#playlist .track-button").forEach(function(el) {
                el.classList.toggle("is-active", Number(el.getAttribute("data-index")) == Number(that.currentIndex));
            });
        },

        fetchServerInfo: function(callback) {
            var that = this;
            fetch(this.apiUrl, {
                method: 'POST',
                body: new URLSearchParams({
                    'do': 'getserverinfo'
                })
            }).then(TrickOrTreat).then((data) => {
                if (data.result.mediaRootUrl && data.result.mediaRootUrl.length > 1) {
                    that.mediaRootUrl = data.result.mediaRootUrl;
                    if (!that.mediaRootUrl.endsWith('/')) {
                        that.mediaRootUrl = that.mediaRootUrl + '/';
                    }
                }
                if (data.result.serverName) {
                    let el = H("server-name");
                    if (el) {
                        el.text(data.result.serverName);
                    }
                    document.title = data.result.serverName;
                }

                typeof callback === 'function' && callback();
            })
        },

        freshFolderlist: function(callback) {
            var that = this;
            var requestBody = {
                'do': 'getfilelist',
            };
            if (that.preferredFormats) {
                requestBody['preferredFormats'] = that.preferredFormats;
            }
            fetch(this.apiUrl, {
                method: 'POST',
                body: new URLSearchParams(requestBody)
            }).then(TrickOrTreat).then((data) => {
                if (data.status != 200) {
                    console.error("Fetch error. Reason: " + data.message + " Url: ./api.php");
                    return;
                }
                that.rootFolders = (data.result.data.subFolderList || []).map(normalizeFolder);
                if (that.path == null) {
                    that.path = "";
                }
                that.renderFolderList();
                that.updateChrome();

                typeof callback === 'function' && callback();
            });
        },

        fetchData: function() {
            var that = this;

            fetch(this.apiUrl, {
                method: 'POST',
                body: new URLSearchParams({
                    'do': 'getfilelist',
                    'folder': that.path || ""
                })
            }).then(TrickOrTreat).then((data) => {
                if (data.status != 200) {
                    that.showStatus(data.message || "Unable to load folder");
                    return;
                }
                that.isSearching = false;
                that.data = data.result.data.musicList || [];
                that.currentIndex = -1;
                that.freshPlaylist();
                that.freshSubFolderList(data.result.data.subFolderList || []);
                that.renderFolderList();
                that.updateChrome();
                that.syncCurrentTrackFromUrl();
            }).catch((error) => {
                that.showStatus(error.message || "Unable to load folder");
            });
        },

        freshPlaylist : function() {
            var that = this;
            var data = this.data || [];
            this.playlist.innerHTML = '';
            if (!data.length) {
                this.playlist.appendChild(this.emptyNode(this.isSearching ? "No matching tracks" : "No tracks in this folder"));
                return;
            }
            data.forEach(function(item, i) {
                var row = document.createElement("li");
                row.className = "track-row";

                var button = document.createElement("button");
                button.type = "button";
                button.className = "track-button";
                button.setAttribute("index", i);
                button.setAttribute("data-index", i);
                button.title = displayName(item);

                var index = document.createElement("span");
                index.className = "track-index";
                index.textContent = i + 1;

                var text = document.createElement("span");
                text.className = "track-text";
                var title = document.createElement("span");
                title.className = "track-title";
                title.textContent = displayName(item);
                var meta = document.createElement("span");
                meta.className = "track-meta ellipsis";
                meta.textContent = trackMeta(item, that.path);
                text.appendChild(title);
                text.appendChild(meta);

                var quality = document.createElement("span");
                quality.className = "track-quality";
                quality.textContent = qualityShort(getAudioInfo(item));

                button.appendChild(index);
                button.appendChild(text);
                button.appendChild(quality);
                row.appendChild(button);
                that.playlist.appendChild(row);
            });
            document.querySelectorAll('#playlist .track-button').forEach(function(el) {
                el.onclick = function() {
                    that.playAtIndex(this.getAttribute('index'));
                };
            });
            this.highlightActiveTrack();
        },

        freshSubFolderList : function(list) {
            var that = this;
            this.subFolders = this.sortFolders((list || []).map(normalizeFolder));
            H("subfolderlist").innerHTML("");
            if (!this.subFolders.length) {
                H("subfolderlist").append(this.emptyNode("No subfolders"));
                H("folder-count").text(plural(0, "folder", "folders"));
                return;
            }
            this.subFolders.forEach(function(item) {
                var row = document.createElement("li");
                row.className = "folder-card";
                var button = document.createElement("button");
                button.type = "button";
                button.className = "folder-button";
                button.setAttribute("data-aim", item.path);
                button.title = displayName(item);

                var name = document.createElement("span");
                name.className = "folder-name";
                name.textContent = displayName(item);
                var meta = document.createElement("span");
                meta.className = "folder-meta";
                meta.textContent = "Open";

                button.appendChild(name);
                button.appendChild(meta);
                row.appendChild(button);
                H("subfolderlist").append(row);
            });
            document.querySelectorAll('#subfolderlist button').forEach(function(el) {
                el.onclick = function() {
                    that.path = ensureTrailingSlash(this.getAttribute('data-aim'));
                    that.clearSearchState();
                    that.fetchData();
                };
            });
            H("folder-count").text(plural(this.subFolders.length, "folder", "folders"));
        },

        emptyNode: function(text) {
            var row = document.createElement("li");
            row.className = "empty-state";
            row.textContent = text;
            return row;
        },

        urlMatch : function() {
            var isUrlMatched = false;
            var re = new RegExp("[#][/](.*[/])([^/]+[.][a-zA-Z0-9]{1,5})[/]");
            var urlMatch = re.exec(location.href);
            if (urlMatch != null) {
                isUrlMatched = true;
                this.path = urlMatch[1];
                this._urlSongPath = this.path + urlMatch[2];
                this.audio.src = this.mediaRootUrl + this._urlSongPath;
                this.audio.play().catch((reason) => { console.log(reason); });
                H(this.nowPlaying).text(trackTitle({fileName: urlMatch[2]}));
                H("playerMeta").text(formatPath(this.path));
                this.renderAudioQuality(fallbackAudioInfo({fileName: urlMatch[2]}));
            }
            if (!isUrlMatched) {
                re = new RegExp("[#][/](.*[/])");
                urlMatch = re.exec(location.href);
                if (urlMatch != null) {
                    isUrlMatched = true;
                    this.path = urlMatch[1];
                }
            }
        },

        applyPlaybackMode: function() {
            var loopBtn = H("btn-loop").el;
            var orderBtn = H("btn-order").el;
            var fullLoopBtn = H("fullBtnLoop").el;
            var fullOrderBtn = H("fullBtnOrder").el;
            var repeatOne = this.loop == 1;
            var listPlayback = !repeatOne && this.order == 1;

            [loopBtn, fullLoopBtn].forEach(function(btn) {
                if (!btn) return;
                btn.innerHTML = controlIcon("repeatOne");
                btn.classList.toggle("is-on", repeatOne);
                btn.setAttribute("aria-pressed", repeatOne ? "true" : "false");
                btn.title = repeatOne ? "Repeat one on" : "Repeat one";
                btn.setAttribute("aria-label", repeatOne ? "Repeat one on" : "Repeat one");
            });

            [orderBtn, fullOrderBtn].forEach(function(btn) {
                if (!btn) return;
                btn.innerHTML = controlIcon("list");
                btn.classList.toggle("is-on", listPlayback);
                btn.setAttribute("aria-pressed", listPlayback ? "true" : "false");
                btn.title = listPlayback ? "List playback on" : "List playback";
                btn.setAttribute("aria-label", listPlayback ? "List playback on" : "List playback");
            });

            this.audio.loop = repeatOne;
            this.audio.onended = listPlayback ? function() {
                H("btn-next").click();
            } : undefined;
        },

        applyLoop : function() {
            this.applyPlaybackMode();
        },

        applyOrder : function() {
            this.applyPlaybackMode();
        },

        applyLegacyModeState: function() {
            if (this.order == 2) {
                this.loop = 1;
                this.order = 0;
            }
            this.loop = this.loop == 1 ? 1 : 0;
            this.order = this.order == 1 ? 1 : 0;
            if (this.loop == 1) this.order = 0;
        },

        goBackFolder: function() {
            if (this.isSearching) {
                this.clearSearch(true);
                return;
            }
            var nextPath = parentPath(this.path);
            this.path = nextPath;
            this.fetchData();
        },

        clearSearchState: function() {
            this.isSearching = false;
            this.searchQuery = "";
            if (this.searchTimer) clearTimeout(this.searchTimer);
            var input = H("search-input").el;
            if (input) input.value = "";
        },

        clearSearch: function(resetInput) {
            this.clearSearchState();
            if (resetInput) {
                var input = H("search-input").el;
                if (input) input.value = "";
            }
            this.fetchData();
        },

        queueSearch: function(query) {
            var that = this;
            query = (query || "").trim();
            this.searchQuery = query;
            if (this.searchTimer) clearTimeout(this.searchTimer);
            if (!query) {
                this.clearSearch(false);
                return;
            }
            H("search-status").text("Searching");
            this.searchTimer = setTimeout(function() {
                that.searchMusic(query);
            }, 260);
        },

        searchMusic: function(query) {
            var that = this;
            var expectedQuery = query;
            fetch(this.apiUrl, {
                method: 'POST',
                body: new URLSearchParams({
                    'do': 'searchmusic',
                    'q': query
                })
            }).then(TrickOrTreat).then((data) => {
                if (that.searchQuery != expectedQuery) return;
                if (data.status != 200) {
                    that.showStatus(data.message || "Search failed");
                    return;
                }
                that.isSearching = true;
                that.data = data.result.data.musicList || [];
                that.currentIndex = -1;
                that.freshSubFolderList([]);
                that.freshPlaylist();
                that.updateChrome();
            }).catch((error) => {
                that.showStatus(error.message || "Search failed");
            });
        },

        showStatus: function(text) {
            H("search-status").text(text);
        },

        updateChrome: function() {
            var trackCount = this.data ? this.data.length : 0;
            H("library-count").text(plural(trackCount, "track", "tracks"));
            if (this.isSearching) {
                H("current-path").text("Search");
                H("content-title").text(this.searchQuery ? "Results for " + this.searchQuery : "Search results");
                H("search-status").text(plural(trackCount, "result", "results"));
            } else {
                H("current-path").text(formatPath(this.path));
                H("content-title").text(leafPath(this.path));
                H("search-status").text("Ready");
            }
            H("folder-count").text(plural(this.subFolders.length, "folder", "folders"));
            var back = H("btn-folder-back").el;
            if (back) {
                back.disabled = this.isSearching ? false : !trimTrailingSlash(this.path);
                back.textContent = "←";
                back.title = this.isSearching ? "Close search" : "Back";
                back.setAttribute("aria-label", this.isSearching ? "Close search" : "Back");
            }
        },

        init : function() {
            var that = this;
            var sortSelect = H("folder-sort").el;
            if (sortSelect) sortSelect.value = this.folderSort;
            this.renderAudioQuality(undefined);
            this.renderAlbumArt(undefined);
            this.fetchServerInfo(function() {
                that.freshFolderlist(function() {
                    that.urlMatch();
                    that.fetchData();
                });
            });
            this.loop = getCookie("pcm-loop") == "1" ? 1 : 0;
            this.order = Number(getCookie("pcm-order") || 0);
            this.applyLegacyModeState();
            this.applyLoop();
            this.applyOrder();
        },

        ready : function() {
            var that = this;
            H("btn-play").innerHTML(controlIcon("play"));
            H("fullBtnPlay").innerHTML(controlIcon("play"));
            H("btn-prev").innerHTML(controlIcon("previous"));
            H("btn-next").innerHTML(controlIcon("next"));
            H("fullBtnPrev").innerHTML(controlIcon("previous"));
            H("fullBtnNext").innerHTML(controlIcon("next"));

            this.audio.ontimeupdate = () => {
                this.applyChapterData();
                H("curTime").text(formatTime(Player.audio.currentTime));
                H("totalTime").text(formatTime(Player.audio.duration));
                H("fullCurTime").text(formatTime(Player.audio.currentTime));
                H("fullTotalTime").text(formatTime(Player.audio.duration));
                var duration = Player.audio.duration || 0;
                H("progress-bar").attr("value", duration ? Player.audio.currentTime / duration * 100 : 0);
                var r = 0;
                for (var i=0; i<Player.audio.buffered.length; ++i)
                    r = r<Player.audio.buffered.end(i) ? Player.audio.buffered.end(i) : r;
                H("progress-bar").attr("buffer", duration ? r / duration * 100 : 0);
                this.updateFullscreenProgress();
            };

            this.audio.onpause = function() {
                H("btn-play").innerHTML(controlIcon("play"));
                H("btn-play").attr("aria-label", "Play");
                H("btn-play").attr("title", "Play");
                H("fullBtnPlay").innerHTML(controlIcon("play"));
                H("fullBtnPlay").attr("aria-label", "Play");
                H("fullBtnPlay").attr("title", "Play");
            }

            this.audio.onplay = function() {
                H("btn-play").innerHTML(controlIcon("pause"));
                H("btn-play").attr("aria-label", "Pause");
                H("btn-play").attr("title", "Pause");
                H("fullBtnPlay").innerHTML(controlIcon("pause"));
                H("fullBtnPlay").attr("aria-label", "Pause");
                H("fullBtnPlay").attr("title", "Pause");
                that.updateMetadata();
            }

            H("progress-bar").click(function(e) {
                if (!that.audio.duration) return;
                var sr=this.getBoundingClientRect();
                var p=(e.clientX-sr.left)/sr.width;
                that.audio.currentTime=that.audio.duration*p;
            });

            H("fullProgress").click(function(e) {
                if (!that.audio.duration) return;
                var sr=this.getBoundingClientRect();
                var p=(e.clientX-sr.left)/sr.width;
                that.audio.currentTime=that.audio.duration*p;
            });

            H("btn-play").click(function() {
                if (that.currentIndex == -1 && that.audio.readyState == 0) {
                    H("btn-next").click();
                    return;
                }
                if(that.audio.paused) {
                    that.audio.play();
                } else {
                    that.audio.pause();
                }
            });

            H("btn-next").click(function() {
                if (!that.data || !that.data.length) return;
                if (that.currentIndex == -1) {
                    that.playAtIndex(0);
                } else if (that.currentIndex == (that.data.length - 1)) {
                    that.playAtIndex(0);
                } else {
                    that.playAtIndex(Number(that.currentIndex) + 1);
                }
            });

            H("btn-prev").click(function() {
                if (!that.data || !that.data.length) return;
                if (that.currentIndex == -1) {
                    that.playAtIndex(0);
                } else if (that.currentIndex == 0) {
                    that.playAtIndex(that.data.length - 1);
                } else {
                    that.playAtIndex(Number(that.currentIndex) - 1);
                }
            });

            H("btn-loop").click(function() {
                that.loop = 1 - that.loop;
                if (that.loop == 1) that.order = 0;
                that.applyPlaybackMode();
                setCookie("pcm-loop", that.loop, 157680000);
                setCookie("pcm-order", that.order, 157680000);
            });

            H("btn-order").click(function() {
                that.order = 1 - that.order;
                if (that.order == 1) that.loop = 0;
                that.applyPlaybackMode();
                setCookie("pcm-loop", that.loop, 157680000);
                setCookie("pcm-order", that.order, 157680000);
            });

            H("playerArtButton").click(function() {
                that.openAlbumArt();
            });

            H("artModalBackdrop").click(function() {
                that.closeAlbumArt();
            });

            H("artModalClose").click(function() {
                that.closeAlbumArt();
            });

            H("fullBtnPlay").click(function() {
                H("btn-play").click();
            });

            H("fullBtnPrev").click(function() {
                H("btn-prev").click();
            });

            H("fullBtnNext").click(function() {
                H("btn-next").click();
            });

            H("fullBtnLoop").click(function() {
                H("btn-loop").click();
            });

            H("fullBtnOrder").click(function() {
                H("btn-order").click();
            });

            document.addEventListener("keydown", function(event) {
                if (event.key == "Escape") that.closeAlbumArt();
            });

            H("btn-folder-back").click(function() {
                that.goBackFolder();
            });

            var sortSelect = H("folder-sort").el;
            if (sortSelect) {
                sortSelect.onchange = function() {
                    that.folderSort = this.value;
                    setCookie("pcm-folder-sort", that.folderSort, 157680000);
                    that.renderFolderList();
                    that.freshSubFolderList(that.subFolders);
                    that.updateChrome();
                };
            }

            var searchInput = H("search-input").el;
            if (searchInput) {
                searchInput.oninput = function() {
                    that.queueSearch(this.value);
                };
            }

            H("search-clear").click(function(e) {
                if (e) e.preventDefault();
                that.clearSearch(true);
            });

            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('previoustrack', function() { H("btn-prev").click(); });
                navigator.mediaSession.setActionHandler('nexttrack', function() { H("btn-next").click(); });
            }
        }
    };

    Player.init();
    Player.ready();
}());
