<?php
	$curPath = dirname(__FILE__);
	$songFolderPath = $curPath; // Change this if you'd like to put your song folders into a sub folder or somewhere else.
	$serverInfo = array(
		"serverName" => "Web Cloud Music",
		"serverShortName" => "WCM",
		// This tell the client the preffered folder name if it supports local storage.
		// Optional, user can still able to change it.
		"baseFolderNameHint" => "wcm",
		// This tell the server which format is preferred if there are multiple formats available for a same music.
		// Optional, server could still simply ignore this hint.
		"preferredFormatsHint" => "mp3,flac,wav,ogg,opus,m4a,aac",
	);

	$allowedExts = array("mp3", "wav", "flac", "ogg", "opus", "m4a", "aac");
	$coverImageExts = array("jpg", "jpeg", "png", "webp");

	function GIVEMETHEFUCKINGUTF8($text) {
		$encoding = mb_detect_encoding($text, mb_detect_order(), true);
		if (!$encoding) return $text;
		$converted = @iconv($encoding, "UTF-8", $text);
		return $converted === false ? $text : $converted;
	}

	function getFileExtension($fileName) {
		$explodeArr = explode('.',$fileName);
		$explodeArr = array_reverse($explodeArr);
		return strtolower($explodeArr[0]);
	}

	function isAudioFile($fileName) {
		global $allowedExts;
		return in_array(getFileExtension($fileName), $allowedExts);
	}

	function ensureTrailingSlash($path) {
		if ($path == "") return "";
		return substr($path, -1) == "/" ? $path : $path."/";
	}

	function isPathInside($path, $basePath) {
		$realPath = realpath($path);
		$realBase = realpath($basePath);
		if ($realPath === false || $realBase === false) return false;
		return $realPath == $realBase || strpos($realPath, $realBase.DIRECTORY_SEPARATOR) === 0;
	}

	function littleEndianUInt16($bytes) {
		$value = unpack("v", $bytes);
		return $value[1];
	}

	function littleEndianUInt32($bytes) {
		$value = unpack("V", $bytes);
		return $value[1];
	}

	function bigEndianUInt32($bytes) {
		$value = unpack("N", $bytes);
		return $value[1];
	}

	function bigEndianUInt24($bytes) {
		return (byteAt($bytes, 0) << 16) | (byteAt($bytes, 1) << 8) | byteAt($bytes, 2);
	}

	function byteAt($bytes, $index) {
		return ord(substr($bytes, $index, 1));
	}

	function coverMimeFromExtension($extension) {
		$extension = strtolower($extension);
		if ($extension == "jpg" || $extension == "jpeg") return "image/jpeg";
		if ($extension == "png") return "image/png";
		if ($extension == "webp") return "image/webp";
		return "application/octet-stream";
	}

	function parseWavInfo($filePath) {
		$fh = @fopen($filePath, "rb");
		if (!$fh) return null;
		$header = fread($fh, 12);
		if (strlen($header) < 12 || substr($header, 0, 4) != "RIFF" || substr($header, 8, 4) != "WAVE") {
			fclose($fh);
			return null;
		}

		$info = array("format" => "WAV");
		$byteRate = 0;
		$dataSize = 0;

		while (!feof($fh)) {
			$chunkHeader = fread($fh, 8);
			if (strlen($chunkHeader) < 8) break;
			$chunkId = substr($chunkHeader, 0, 4);
			$chunkSize = littleEndianUInt32(substr($chunkHeader, 4, 4));
			if ($chunkId == "fmt ") {
				$chunk = fread($fh, min($chunkSize, 32));
				if (strlen($chunk) >= 16) {
					$info["codec"] = littleEndianUInt16(substr($chunk, 0, 2)) == 1 ? "PCM" : "WAV";
					$info["channels"] = littleEndianUInt16(substr($chunk, 2, 2));
					$info["sampleRate"] = littleEndianUInt32(substr($chunk, 4, 4));
					$byteRate = littleEndianUInt32(substr($chunk, 8, 4));
					$info["bitsPerSample"] = littleEndianUInt16(substr($chunk, 14, 2));
					if ($byteRate > 0) $info["bitRate"] = $byteRate * 8;
				}
				if ($chunkSize > strlen($chunk)) fseek($fh, $chunkSize - strlen($chunk), SEEK_CUR);
			} else if ($chunkId == "data") {
				$dataSize = $chunkSize;
				fseek($fh, $chunkSize, SEEK_CUR);
			} else {
				fseek($fh, $chunkSize, SEEK_CUR);
			}
			if ($chunkSize % 2 == 1) fseek($fh, 1, SEEK_CUR);
		}

		if ($dataSize > 0 && $byteRate > 0) $info["duration"] = round($dataSize / $byteRate, 3);
		fclose($fh);
		return $info;
	}

	function syncSafeInt($bytes) {
		return (byteAt($bytes, 0) << 21) | (byteAt($bytes, 1) << 14) | (byteAt($bytes, 2) << 7) | byteAt($bytes, 3);
	}

	function parseMp3FrameHeader($header) {
		if (strlen($header) < 4) return null;
		$b1 = byteAt($header, 0);
		$b2 = byteAt($header, 1);
		$b3 = byteAt($header, 2);
		$b4 = byteAt($header, 3);
		$bits = ($b1 << 24) | ($b2 << 16) | ($b3 << 8) | $b4;
		if (($bits & 0xFFE00000) != 0xFFE00000) return null;

		$versionId = ($bits >> 19) & 0x03;
		$layerBits = ($bits >> 17) & 0x03;
		$bitRateIndex = ($bits >> 12) & 0x0F;
		$sampleRateIndex = ($bits >> 10) & 0x03;
		$channelMode = ($bits >> 6) & 0x03;
		if ($versionId == 1 || $layerBits == 0 || $bitRateIndex == 0 || $bitRateIndex == 15 || $sampleRateIndex == 3) return null;

		$versionKey = $versionId == 3 ? "mpeg1" : "mpeg2";
		$layerKey = $layerBits == 3 ? "layer1" : ($layerBits == 2 ? "layer2" : "layer3");
		$bitRateTable = array(
			"mpeg1" => array(
				"layer1" => array(0,32,64,96,128,160,192,224,256,288,320,352,384,416,448),
				"layer2" => array(0,32,48,56,64,80,96,112,128,160,192,224,256,320,384),
				"layer3" => array(0,32,40,48,56,64,80,96,112,128,160,192,224,256,320)
			),
			"mpeg2" => array(
				"layer1" => array(0,32,48,56,64,80,96,112,128,144,160,176,192,224,256),
				"layer2" => array(0,8,16,24,32,40,48,56,64,80,96,112,128,144,160),
				"layer3" => array(0,8,16,24,32,40,48,56,64,80,96,112,128,144,160)
			)
		);
		$sampleRates = array(
			3 => array(44100, 48000, 32000),
			2 => array(22050, 24000, 16000),
			0 => array(11025, 12000, 8000)
		);
		$versionLabel = $versionId == 3 ? "MPEG-1" : ($versionId == 2 ? "MPEG-2" : "MPEG-2.5");
		$layerLabel = $layerBits == 3 ? "Layer I" : ($layerBits == 2 ? "Layer II" : "Layer III");

		return array(
			"format" => "MP3",
			"codec" => $versionLabel." ".$layerLabel,
			"bitRate" => $bitRateTable[$versionKey][$layerKey][$bitRateIndex] * 1000,
			"sampleRate" => $sampleRates[$versionId][$sampleRateIndex],
			"channels" => $channelMode == 3 ? 1 : 2
		);
	}

	function parseMp3Info($filePath) {
		$fh = @fopen($filePath, "rb");
		if (!$fh) return null;
		$offset = 0;
		$header = fread($fh, 10);
		if (strlen($header) == 10 && substr($header, 0, 3) == "ID3") {
			$flags = byteAt($header, 5);
			$offset = 10 + syncSafeInt(substr($header, 6, 4));
			if ($flags & 0x10) $offset += 10;
		}
		fseek($fh, $offset, SEEK_SET);
		$scan = fread($fh, 65536);
		fclose($fh);
		for ($i = 0; $i < strlen($scan) - 4; $i++) {
			if (byteAt($scan, $i) == 0xFF && (byteAt($scan, $i + 1) & 0xE0) == 0xE0) {
				$info = parseMp3FrameHeader(substr($scan, $i, 4));
				if ($info) return $info;
			}
		}
		return array("format" => "MP3");
	}

	function parseFlacInfo($filePath) {
		$fh = @fopen($filePath, "rb");
		if (!$fh) return null;
		$marker = fread($fh, 4);
		if ($marker != "fLaC") {
			fclose($fh);
			return null;
		}
		while (!feof($fh)) {
			$header = fread($fh, 4);
			if (strlen($header) < 4) break;
			$isLast = (byteAt($header, 0) & 0x80) != 0;
			$type = byteAt($header, 0) & 0x7F;
			$length = (byteAt($header, 1) << 16) | (byteAt($header, 2) << 8) | byteAt($header, 3);
			if ($type == 0 && $length >= 34) {
				$streamInfo = fread($fh, $length);
				if (strlen($streamInfo) >= 18) {
					$sampleRate = (byteAt($streamInfo, 10) << 12) | (byteAt($streamInfo, 11) << 4) | ((byteAt($streamInfo, 12) & 0xF0) >> 4);
					$channels = ((byteAt($streamInfo, 12) & 0x0E) >> 1) + 1;
					$bitsPerSample = (((byteAt($streamInfo, 12) & 0x01) << 4) | ((byteAt($streamInfo, 13) & 0xF0) >> 4)) + 1;
					$totalSamples = ((byteAt($streamInfo, 13) & 0x0F) * 4294967296) + (byteAt($streamInfo, 14) << 24) + (byteAt($streamInfo, 15) << 16) + (byteAt($streamInfo, 16) << 8) + byteAt($streamInfo, 17);
					$info = array(
						"format" => "FLAC",
						"codec" => "FLAC",
						"sampleRate" => $sampleRate,
						"channels" => $channels,
						"bitsPerSample" => $bitsPerSample
					);
					if ($sampleRate > 0 && $totalSamples > 0) {
						$duration = $totalSamples / $sampleRate;
						$info["duration"] = round($duration, 3);
						$info["bitRate"] = round(filesize($filePath) * 8 / $duration);
					}
					fclose($fh);
					return $info;
				}
			} else {
				fseek($fh, $length, SEEK_CUR);
			}
			if ($isLast) break;
		}
		fclose($fh);
		return array("format" => "FLAC");
	}

	function skipId3Text($data, $offset, $encoding) {
		$length = strlen($data);
		if ($encoding == 1 || $encoding == 2) {
			for ($i = $offset; $i + 1 < $length; $i += 2) {
				if (substr($data, $i, 2) == "\0\0") return $i + 2;
			}
			return $length;
		}
		$end = strpos($data, "\0", $offset);
		return $end === false ? $length : $end + 1;
	}

	function parseMp3ApicFrame($frameData, $version) {
		if (strlen($frameData) < 6) return null;
		$encoding = byteAt($frameData, 0);
		$offset = 1;
		if ($version == 2) {
			$imageFormat = strtoupper(substr($frameData, $offset, 3));
			$offset += 3;
			$mime = $imageFormat == "PNG" ? "image/png" : "image/jpeg";
		} else {
			$mimeEnd = strpos($frameData, "\0", $offset);
			if ($mimeEnd === false) return null;
			$mime = substr($frameData, $offset, $mimeEnd - $offset);
			if ($mime == "image/jpg") $mime = "image/jpeg";
			if ($mime == "") $mime = "image/jpeg";
			$offset = $mimeEnd + 1;
		}
		if ($offset >= strlen($frameData)) return null;
		$offset += 1;
		$offset = skipId3Text($frameData, $offset, $encoding);
		if ($offset >= strlen($frameData)) return null;
		$imageData = substr($frameData, $offset);
		if (strlen($imageData) < 16) return null;
		return array("mime" => $mime, "data" => $imageData);
	}

	function readMp3Cover($filePath) {
		$fh = @fopen($filePath, "rb");
		if (!$fh) return null;
		$header = fread($fh, 10);
		if (strlen($header) != 10 || substr($header, 0, 3) != "ID3") {
			fclose($fh);
			return null;
		}
		$version = byteAt($header, 3);
		$flags = byteAt($header, 5);
		$tagSize = syncSafeInt(substr($header, 6, 4));
		if ($flags & 0x10) $tagSize += 10;
		$tagData = fread($fh, min($tagSize, 25 * 1024 * 1024));
		fclose($fh);

		$cursor = 0;
		$tagLength = strlen($tagData);
		while ($version == 2 && $cursor + 6 <= $tagLength) {
			$frameId = substr($tagData, $cursor, 3);
			$frameSize = bigEndianUInt24(substr($tagData, $cursor + 3, 3));
			$cursor += 6;
			if ($frameSize <= 0 || $cursor + $frameSize > $tagLength) break;
			if ($frameId == "PIC") {
				$cover = parseMp3ApicFrame(substr($tagData, $cursor, $frameSize), $version);
				if ($cover) return $cover;
			}
			$cursor += $frameSize;
		}

		while ($version >= 3 && $cursor + 10 <= $tagLength) {
			$frameId = substr($tagData, $cursor, 4);
			if (trim($frameId, "\0") == "") break;
			$frameSizeBytes = substr($tagData, $cursor + 4, 4);
			$frameSize = $version == 4 ? syncSafeInt($frameSizeBytes) : bigEndianUInt32($frameSizeBytes);
			$cursor += 10;
			if ($frameSize <= 0 || $cursor + $frameSize > $tagLength) break;
			if ($frameId == "APIC") {
				$cover = parseMp3ApicFrame(substr($tagData, $cursor, $frameSize), $version);
				if ($cover) return $cover;
			}
			$cursor += $frameSize;
		}

		return null;
	}

	function parseFlacPictureBlock($block) {
		$cursor = 0;
		$length = strlen($block);
		if ($length < 32) return null;
		$cursor += 4;
		$mimeLength = bigEndianUInt32(substr($block, $cursor, 4));
		$cursor += 4;
		if ($cursor + $mimeLength + 4 > $length) return null;
		$mime = substr($block, $cursor, $mimeLength);
		$cursor += $mimeLength;
		$descriptionLength = bigEndianUInt32(substr($block, $cursor, 4));
		$cursor += 4 + $descriptionLength;
		if ($cursor + 20 > $length) return null;
		$cursor += 16;
		$dataLength = bigEndianUInt32(substr($block, $cursor, 4));
		$cursor += 4;
		if ($dataLength <= 0 || $cursor + $dataLength > $length) return null;
		return array("mime" => $mime ? $mime : "image/jpeg", "data" => substr($block, $cursor, $dataLength));
	}

	function readFlacCover($filePath) {
		$fh = @fopen($filePath, "rb");
		if (!$fh) return null;
		$marker = fread($fh, 4);
		if ($marker != "fLaC") {
			fclose($fh);
			return null;
		}
		while (!feof($fh)) {
			$header = fread($fh, 4);
			if (strlen($header) < 4) break;
			$isLast = (byteAt($header, 0) & 0x80) != 0;
			$type = byteAt($header, 0) & 0x7F;
			$length = (byteAt($header, 1) << 16) | (byteAt($header, 2) << 8) | byteAt($header, 3);
			if ($type == 6) {
				$block = fread($fh, $length);
				fclose($fh);
				return parseFlacPictureBlock($block);
			}
			fseek($fh, $length, SEEK_CUR);
			if ($isLast) break;
		}
		fclose($fh);
		return null;
	}

	function readEmbeddedCover($filePath, $extension) {
		$extension = strtolower($extension);
		if ($extension == "mp3") return readMp3Cover($filePath);
		if ($extension == "flac") return readFlacCover($filePath);
		return null;
	}

	function findFolderCover($folderPath) {
		global $coverImageExts;
		$fileList = @scandir($folderPath);
		if ($fileList === false) return null;
		$lookup = array();
		foreach ($fileList as $fileName) {
			if ($fileName == "." || $fileName == "..") continue;
			$lookup[strtolower($fileName)] = $fileName;
		}
		$baseNames = array("cover", "folder", "front", "album", "artwork");
		foreach ($baseNames as $baseName) {
			foreach ($coverImageExts as $extension) {
				$key = $baseName.".".$extension;
				if (isset($lookup[$key])) return $folderPath."/".$lookup[$key];
			}
		}
		foreach ($fileList as $fileName) {
			if ($fileName == "." || $fileName == "..") continue;
			$extension = getFileExtension($fileName);
			if (in_array($extension, $coverImageExts)) return $folderPath."/".$fileName;
		}
		return null;
	}

	function resolveRequestedAudioPath($encodedFilePath) {
		global $songFolderPath;
		$requestFilePath = urldecode($encodedFilePath);
		$actualFilePath = $songFolderPath."/".$requestFilePath;
		if (!file_exists($actualFilePath) || !isPathInside($actualFilePath, $songFolderPath) || !isAudioFile($actualFilePath)) return null;
		return $actualFilePath;
	}

	function serveCover($encodedFilePath) {
		$filePath = resolveRequestedAudioPath($encodedFilePath);
		if (!$filePath) {
			http_response_code(404);
			exit;
		}
		$extension = getFileExtension($filePath);
		$cover = readEmbeddedCover($filePath, $extension);
		if ($cover && isset($cover["data"])) {
			header("Content-Type: ".$cover["mime"]);
			header("Cache-Control: public, max-age=604800");
			exit($cover["data"]);
		}
		$folderCover = findFolderCover(dirname($filePath));
		if ($folderCover && file_exists($folderCover)) {
			header("Content-Type: ".coverMimeFromExtension(getFileExtension($folderCover)));
			header("Cache-Control: public, max-age=604800");
			readfile($folderCover);
			exit;
		}
		http_response_code(404);
		exit;
	}

	function getAudioInfo($filePath, $extension) {
		$extension = strtolower($extension);
		if ($extension == "wav") return parseWavInfo($filePath);
		if ($extension == "mp3") return parseMp3Info($filePath);
		if ($extension == "flac") return parseFlacInfo($filePath);
		return array("format" => strtoupper($extension));
	}

	function buildFolderItem($requestFolderStr, $utf8FileName, $curFilePath) {
		return array(
			"path" => $requestFolderStr.rawurlencode($utf8FileName),
			"fileName" => rawurlencode($utf8FileName),
			"displayName" => $utf8FileName,
			"modifiedTime" => filemtime($curFilePath)
		);
	}

	function buildMusicItem($actualSongFolder, $oneFileName, $requestFolderStr) {
		$utf8FileName = GIVEMETHEFUCKINGUTF8($oneFileName);
		$curFilePath = "{$actualSongFolder}/{$oneFileName}";
		$infoJsonFile = pathinfo($curFilePath, PATHINFO_FILENAME);
		$infoJsonFilePath = "{$actualSongFolder}/{$infoJsonFile}.info.json";
		$extension = getFileExtension($utf8FileName);
		return array(
			"fileName"       => rawurlencode($utf8FileName),
			"displayName"    => $utf8FileName,
			"folder"         => ensureTrailingSlash($requestFolderStr),
			"coverUrl"       => "./api.php?do=getcover&file=".rawurlencode(ensureTrailingSlash($requestFolderStr).rawurlencode($utf8FileName)),
			"fileSize"       => filesize($curFilePath),
			"modifiedTime"   => filemtime($curFilePath),
			"extension"      => $extension,
			"audioInfo"      => getAudioInfo($curFilePath, $extension),
			"additionalInfo" => file_exists($infoJsonFilePath)
		);
	}

	function textContains($haystack, $needle) {
		if ($needle == "") return true;
		if (function_exists("mb_stripos")) return mb_stripos($haystack, $needle, 0, "UTF-8") !== false;
		return stripos($haystack, $needle) !== false;
	}

	function searchMusicFiles($actualFolder, $encodedFolder, $query, &$musicList, $maxResults) {
		if (count($musicList) >= $maxResults) return;
		$fileList = @scandir($actualFolder);
		if ($fileList === false) return;
		foreach ($fileList as $oneFileName) {
			if (count($musicList) >= $maxResults) return;
			if ($oneFileName == "." || $oneFileName == "..") continue;
			$curFilePath = "{$actualFolder}/{$oneFileName}";
			$utf8FileName = GIVEMETHEFUCKINGUTF8($oneFileName);
			if (is_dir($curFilePath)) {
				if (substr($oneFileName, 0, 1) == ".") continue;
				searchMusicFiles($curFilePath, ensureTrailingSlash($encodedFolder.rawurlencode($utf8FileName)), $query, $musicList, $maxResults);
				continue;
			}
			if (!isAudioFile($utf8FileName)) continue;
			$searchText = $utf8FileName." ".urldecode(str_replace("/", " ", $encodedFolder));
			if (textContains($searchText, $query)) {
				array_push($musicList, buildMusicItem($actualFolder, $oneFileName, $encodedFolder));
			}
		}
	}

	function fire($status, $message, $result = null) {
		if ($result == null) unset($result);
		$httpStatusCode = array(
			200 => "HTTP/1.1 200 OK",
			400 => "HTTP/1.1 400 Bad Request",
			401 => "HTTP/1.1 401 Unauthorized",
			403 => "HTTP/1.1 403 Forbidden",
			404 => "HTTP/1.1 404 Not Found",
			500 => "HTTP/1.1 500 Internal Server Error",
			501 => "HTTP/1.1 501 Not Implemented",
			503 => "HTTP/1.1 503 Service Unavailable",
			504 => "HTTP/1.1 504 Gateway Time-out"
		);
		if (function_exists('http_response_code')) {
			http_response_code(intval($status));
		} else {
			@header($httpStatusCode[$status]);
		}
		header('Content-Type: application/json');
		exit(json_encode(compact("status", "message", "result")));
	}

	//------------------------------------------------------------------------------

	if(isset($_GET['do']) && strtolower($_GET['do']) == "getcover") {
		$requestFileStr = isset($_GET['file']) ? $_GET['file'] : "";
		serveCover($requestFileStr);
	}

	if(!filter_has_var(INPUT_POST, 'do')) {
		fire(400, "Illegal request!");
	}

	$command = strtolower($_POST['do']);

	switch($command) {
		case "getserverinfo":
			$urlPath = pathinfo($_SERVER['REQUEST_URI'], PATHINFO_DIRNAME);
			$result = array(
				"apiVersion" => 2,
				// This is required for concatenate the full media url for playback since we only return a file name in getfilelist API.
				// for this implementaion, the media root url is the same base url as the api url.
				"mediaRootUrl" => ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') ? 'https://' : 'http://').$_SERVER['HTTP_HOST'].$urlPath,
			);
			fire(200, "OK", array_merge($serverInfo, $result));
			break;
		case "getfilelist":
			$requestFolderStr = "";
			if(isset($_POST['folder'])) $requestFolderStr = $_POST['folder'];
			if(substr($requestFolderStr, -1) != '/' && strlen($requestFolderStr) > 1) $requestFolderStr.='/';
			$actualSongFolder = null;
			if(is_dir($songFolderPath."/".urldecode($requestFolderStr))) {
				$actualSongFolder = $songFolderPath."/".urldecode($requestFolderStr);
			} else {
				// Solve problem if using weird charset.
				// This will cause problem if given path is not a single folder.
				// eg. "Folder/Subfolder/".
				$folderList = scandir($songFolderPath);
				foreach ($folderList as $oneFolderName) {
					if (GIVEMETHEFUCKINGUTF8($oneFolderName)."/"==urldecode($requestFolderStr)) {
						$actualSongFolder="{$songFolderPath}/{$oneFolderName}";
						break;
					}
				}
			}
			if ($actualSongFolder == null || !isPathInside($actualSongFolder, $songFolderPath)) fire(404, "Folder \"{$requestFolderStr}\" not exist!");
			$fileList = scandir($actualSongFolder);
			$musicList = array();
			$subFolderList = array();
			foreach ($fileList as $oneFileName) {
				if ($oneFileName == "." || $oneFileName == "..") continue;
				$utf8FileName = GIVEMETHEFUCKINGUTF8($oneFileName);
				$curFilePath = "{$actualSongFolder}/{$oneFileName}";
				if (is_dir($curFilePath)) {
					array_push($subFolderList, buildFolderItem($requestFolderStr, $utf8FileName, $curFilePath));
					continue;
				}
				if (isAudioFile($utf8FileName)) {
					array_push($musicList, buildMusicItem($actualSongFolder, $oneFileName, $requestFolderStr));
				}
			}
			$result = array("type"=>"fileList", "data"=>compact("musicList", "subFolderList"));
			fire(200, "OK", $result);
			break;
		case "searchmusic":
			$query = "";
			if(isset($_POST['q'])) $query = trim($_POST['q']);
			$musicList = array();
			if ($query != "") searchMusicFiles($songFolderPath, "", $query, $musicList, 300);
			$result = array("type"=>"searchResult", "data"=>compact("musicList"));
			fire(200, "OK", $result);
			break;
		default:
			fire(400, "Illegal request!");
	}
