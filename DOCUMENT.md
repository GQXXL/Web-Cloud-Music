## API Description

- All APIs are directly send to the backend of Web Cloud Music. For example, `api.php` on your server. and all APIs are using **POST** method.

- Content-Type of your request should be `x-www-form-urlencoded`. 

- Use `do` parameter to specify what data is requested. and use other additional parameter accroding to your `do` parameter.

- Always return a **json** to process. Contains a http `status` code node, a `message` node. and the most important `result` node.

- `result` node only avaliable if the request is legal. Contains the data content `type` and the main `data` content.

------------------------------------------------------------------

## API Spec

### Get server information for later use.

* POST:
	+ 'do' = "getserverinfo"

* RETURN:
	json with the following struct.

``` json
{
	"status": 200,
	"message": "OK",
	"result": {
		"serverName": "Server Name",
		"serverShortName": "SN",
		"baseFolderNameHint": "sn",
		"preferredFormatsHint": "mp3,ogg",
		"apiVersion": 2,
		"mediaRootUrl": "http://localhost/pcm/"
	}
}
```

### Get file list of given folder name.

* POST:
	+ 'do' = "getfilelist"
	+ 'folder' = folder name (optional, default value = "")

* RETURN:
	json with the following struct. (if folder exist)

``` json
{
	"status": 200,
	"message": "OK",
	"result":{
		"type": "fileList",
		"data": {
			"musicList": [
				{
					"fileName": "FileName.mp3",
					"displayName": "FileName.mp3",
					"folder": "FolderA/",
					"fileSize": 123123123,
					"modifiedTime": "1313065072",
					"extension": "mp3",
					"audioInfo": {
						"format": "MP3",
						"codec": "MPEG-1 Layer III",
						"sampleRate": 44100,
						"bitRate": 320000,
						"channels": 2
					},
					"additionalInfo": false
				},
				{
					"fileName": "FileName2.wav",
					"displayName": "FileName2.wav",
					"folder": "FolderA/",
					"fileSize": 123123123,
					"modifiedTime": "1313065072",
					"extension": "wav",
					"audioInfo": {
						"format": "WAV",
						"codec": "PCM",
						"sampleRate": 48000,
						"bitsPerSample": 24,
						"bitRate": 2304000,
						"channels": 2
					},
					"additionalInfo": false
				}
			],
			"subFolderList": [
				{
					"path": "FolderA/SubfolderA",
					"fileName": "SubfolderA",
					"displayName": "SubfolderA",
					"modifiedTime": "1313065072"
				},
				{
					"path": "FolderA/SubfolderB",
					"fileName": "SubfolderB",
					"displayName": "SubfolderB",
					"modifiedTime": "1313065072"
				}
			]
		}
	}
}
```

`audioInfo` is parsed from file headers when possible. Current built-in parsers detect MP3 frame headers, WAV RIFF/fmt chunks, and FLAC STREAMINFO blocks. Other allowed browser formats return at least their `format` value.

### Search music by file or folder name.

* POST:
	+ 'do' = "searchmusic"
	+ 'q' = search keyword

* RETURN:
	json with the following struct.

``` json
{
	"status": 200,
	"message": "OK",
	"result": {
		"type": "searchResult",
		"data": {
			"musicList": [
				{
					"fileName": "FileName.flac",
					"displayName": "FileName.flac",
					"folder": "FolderA/",
					"fileSize": 123123123,
					"modifiedTime": "1313065072",
					"extension": "flac",
					"audioInfo": {
						"format": "FLAC",
						"sampleRate": 96000,
						"bitsPerSample": 24,
						"channels": 2
					},
					"additionalInfo": false
				}
			]
		}
	}
}
```

### Playback

Media file located at URL: `mediaRootUrl` + `path` + `fileName`. `mediaRootUrl` can be obtained from the `getserverinfo` API, `path` is the folder path of the current media file.

Once you get the URL, just feed the url to the player.

### If anything wrong.

* RETURN:
	+ json with HTTP status code and error message.

``` json
{
	"status": 400,
	"message": "illegal request!",
}
```

------------------------------------------------------------------

## Example

We assume your Web Cloud Music backend can be access at url `http://foo.bar/baz/api.php` and we use `wget` for the following example.

### Get file list of given folder name.

``` bash
	wget --post-data "do=getfilelist&folder=Folder1" http://foo.bar/baz/api.php
```

If `Folder1` exist, this will get the audio file list inside the folder named `Folder1`. Since `do` parameter value is `getplaylist`. If that folder doesn't exist, will get an error contains the http status code and the error message.
