var RecordRTC = require('recordrtc');

Video = React.createClass( {

  getInitialState() {
    return {
      accessToken: '',
      // ==>> This is what the user will have to change in order
      // to upload his video to his own channel:
      // go to console.developer.google.com and create an OAuth
      // clientID
      clientId: '463787160210-89kiojjsupa9u2g2s946g7em5d8t6kdj.apps.googleusercontent.com',
      // <<==
      scopes: [
        'https://www.googleapis.com/auth/youtube', 
        'https://www.googleapis.com/auth/plus.login', 
        'https://www.googleapis.com/auth/userinfo.email'
      ],  
      stream: '',
      mediaConstraints: { video: true, audio: true },
      titleVideo: '',
      descVideo: '',
      privacyVideo: '',
      recordRTC: '',
      recordedBlob: '',
      uploadVideo: '',
      videoId: '',
      youtubeVideoEmbed: '',
      youtubeVideoUrl: ''
    }   
  },

  /*
    Modify state methods
  */

  saveStreamData: function(stream) {
    this.setState({stream: stream});
  },


  saveToken(accessToken) {
    this.setState({accessToken: accessToken});
  },
  saveUploadVideoSession(uploadVideo) {
    this.setState({uploadVideo: uploadVideo});
  },
  saveVideoInfos(title, desc, privacy) {
    this.setState({
      titleVideo: title,
      descVideo: desc,
      privacyVideo: privacy
    });
  },
  saveRecordRTC(recordRTC) {
    this.setState({recordRTC: recordRTC});
  },
  updateRecordedBlob(updatedBlob) {
    this.setState({recordedBlob: updatedBlob});
  },
  saveVideoId(videoId) {
    console.log('called!', videoId);
    this.setState({videoId: videoId});
  },
  saveYoutubeUrl(videoId) {
    this.setState({
      youtubeVideoEmbed: 'https://www.youtube.com/embed/'+videoId,
      youtubeVideoUrl: 'https://www.youtube.com/watch?v='+videoId
    });
  },

  componentDidMount() {
    // This is where the authentication process starts
    if(gapi.auth) {
      this.authorizeApp();
    } else {
      this.checkGAPI();
    }
  },



  /* 
    UploadVideo: Constructor method
  */

  UploadVideo(self) {
    var video = document.getElementById('camera-stream');

    this.tags = ['youtube-cors-upload'];
    this.categoryId = 22;
    this.videoId = '';
    this.uploadStartTime = 0;
    

    this.ready = function(accessToken) {
      this.accessToken = accessToken;
      this.gapi = gapi;
      this.authenticated = true;
      this.gapi.client.request({
        path: '/youtube/v3/channels',
        params: {
          part: 'snippet',
          mine: true
        },
        callback: function(response) {
          if (response.error) {
            console.log(response.error.message);
          } else {
            console.log('ready success');
          }
        }.bind(this)
      });     
    }
    this.uploadFile = function(file) {
      var metadata = {
        snippet: {
          title: self.state.titleVideo,
          description: self.state.descVideo,
          tags: this.tags,
          categoryId: this.categoryId
        },
        status: {
          privacyStatus: self.state.privacyVideo
        }
      };
      var uploader = new MediaUploader({
        baseUrl: 'https://www.googleapis.com/upload/youtube/v3/videos',
        file: file,
        token: self.state.accessToken,
        metadata: metadata,
        params: {
          part: Object.keys(metadata).join(',')
        },
        onError: function(data) {
          var message = data;
          try {
            var errorResponse = JSON.parse(data);
            message = errorResponse.error.message;
            console.log(message);
          } finally {
            alert(message);
          }
        }.bind(this),
        onProgress: function(data) {
          console.log('onprogress');
          var currentTime = Date.now();
          var bytesUploaded = data.loaded;
          var totalBytes = data.total;
          // The times are in millis, so we need to divide by 1000 to get seconds.
          var bytesPerSecond = bytesUploaded / ((currentTime - this.uploadStartTime) / 1000);
          var estimatedSecondsRemaining = (totalBytes - bytesUploaded) / bytesPerSecond;
          var percentageComplete = (bytesUploaded * 100) / totalBytes;
        }.bind(this),
        onComplete: function(data) {
          console.log('completed');
          var uploadResponse = JSON.parse(data);
          this.videoId = uploadResponse.id;

          // Takes care of calling our saveVideoId method
          // that allows us to stock our video ID in order
          // to display it afterwards
          var videoIdVar = this.videoId;
          self.handleVideoId.bind(this, videoIdVar)();

          // Hides upload video div and show our 
          // fetched youtube video
          self.refs.video.style.visibility="hidden";
          self.refs.youtubeVideo.style.visibility="visible";
          self.cleanAfterUpload();
        }.bind(this)
      });
      this.uploadStartTime = Date.now();
      uploader.upload();
    }
    this.handleUploadClick = function() {
      var video = document.getElementById('camera-stream');
      this.uploadFile(self.state.recordedBlob);
    }
  },




  /*
    Authentication with GoogleAPI
  */

  // This function allow us to wait until gapi.auth is loaded
  // before starting our authentication with authorizeApp
  checkGAPI() {
    if(gapi.auth) {
      this.authorizeApp();
    } else {
      setTimeout(this.checkGAPI, 100);
    }
  },

  // This the first function called in our authentication process
  // it initiates the authentication
  authorizeApp() {
    var clientId = this.state.clientId;
    var scopes = this.state.scopes;
    var checkAuth = this.checkAuth;
    gapi.auth.init(function() {
      window.setTimeout(checkAuth(clientId, scopes),1);
    });
  },

  // This checks with the API that our clientID and scopes are valid
  // ====>> this is where the youtube user account is defined
  // the clientID defines the account associated
  checkAuth(clientId, scopes) {
    gapi.auth.authorize({
      client_id: clientId, 
      scope: scopes, 
      immediate: true
    }, this.handleAuthResult);
  },

  // This checks whether there is any error with our cliendID and
  // scopes before pursuing
  handleAuthResult(authResult) {
    if (authResult && !authResult.error) {
      this.loadAPIClientInterfaces(authResult);         
    } else {
      console.log(authResult.error);
    }
  },

  // This is the final step in our authentication:
  // an access token is fetched and stored in our App state
  // to be reused at the uploading stage
  loadAPIClientInterfaces(authResult) {
    // Stores our current token in state variable
    var accessToken = authResult.access_token;
    this.saveToken(accessToken);

    gapi.client.load('youtube', 'v3', function() {
    console.log('youtube api loaded');
    });
    // After authentication is complete, we set up the future
    // upload
    this.createUploadClass();
  },




  /*
    Setting up the Future upload
  */

  // This checks whether the access token is fetched and stored
  // in our App state and calls the UploadVideo constructor
  // passing it our access token. This sets up our app to be
  // ready for uploading
  createUploadClass() {
    //This variable avoids having binding issue 
    // regarding 'this' in UploadVideo()
    var self = this;

    if(this.state.accessToken != '') {
      var UploadFunction = this.UploadVideo;
      var accessToken = this.state.accessToken;

      // This created a new session of our UploadVideo
      // and saves it to our App state 
      var uploadVideo = new UploadFunction(self);
      self.saveUploadVideoSession(uploadVideo);

      self.state.uploadVideo.ready(accessToken);    
    } else {
      setTimeout(this.createUploadClass, 100)
    }
  },

  /*
    Starting the capture and rendering its stream to our video div
  */


  // This is called when the user clicks on the camera icon
  // starting the video capture by the device's camera/ microphone 
  renderVideo() {
    this.refs.video.style.visibility = 'visible';
    this.refs.record.style.display = 'none';
    this.captureVideoAudio();
  },

  // This method only turns on the device's camera and microphone
  // and transmit their stream 'localMediaStream' to our video div
  captureVideoAudio() {

    this.refs.cameraStream.muted = true;
    navigator.getUserMedia = (navigator.getUserMedia ||
                              navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia || 
                              navigator.msGetUserMedia);
    var self = this;
    var stream = this.state.stream;
    if (navigator.getUserMedia) {
      // Request the camera.
      navigator.getUserMedia(
        // Constraints
        self.state.mediaConstraints,

        // Success Callback
        function(stream) {
          console.log(stream);
          self.saveStreamData(stream);

          //Rendering video on screen part

          // Get a reference to the video element on the page.
          var video = document.getElementById('camera-stream');

          // Create an object URL for the video stream and use this 
          // to set the video source.
          video.src = window.URL.createObjectURL(stream);
          console.log(stream.getTracks());
        },

        // Error Callback
        function(err) {
          // Log the error to the console.
          console.log('The following error occurred when trying to use getUserMedia: ' + err);
        }
      );

    } else {
      alert('Sorry, your browser does not support getUserMedia');
    }   
  },


  /*
    Recording of our video
  */

  // This method is called when the user clicks on the record 
  // button: it gets the stream from 'localMediaStream' and 
  // stores it in our App state with saveRecordRTC
  recordVideo() {
    this.refs.buttonRecord.style.display= 'none';
    this.refs.buttonStop.style.display= 'initial';
    this.refs.cameraStream.style.outline = 'solid red 1px';
    var self = this;
    var stream = this.state.stream;
    navigator.getUserMedia(
      // Constraints
      self.state.mediaConstraints,

      // Success Callback
      function(stream) {
        //RecordRTC part - recording of the video

        // Get a reference to the video element on the page.
        var video = document.getElementById('camera-stream');

        var options = {
          mimeType: 'video/webm',
          audioBitsPerSecond: 128000,
          videoBitsPerSecond: 128000,
          bitsPerSecond: 128000,
          bufferSize: 16384,
          sampleRate: 96000
        };
        var recordRTC = RecordRTC(stream, options);
        self.saveRecordRTC(recordRTC);
        self.state.recordRTC.startRecording();
        console.log('Recording started!');
      },

      // Error Callback
      function(err) {
        // Log the error to the console.
        console.log('The following error occurred when trying to use getUserMedia: ' + err);
      }
    );  
  },

  //This method stops our recording and update our blob with a
  // name and a date to convert it into a file that we can upload
  // on Youtube:  
  stopRecording() {
    this.refs.buttonStop.style.display= 'none';
    this.refs.buttonUpload.style.display = 'initial';
    this.refs.cameraStream.style.outline = 'solid green 1px';
    this.refs.cameraStream.muted = false;
    this.refs.cameraStream.autoPlay = 'disabled';
    this.refs.cameraStream.controls = true;
    var video = document.getElementById('camera-stream');
    video.muted = false;
    

    var self = this;
    var stream = this.state.stream;



    navigator.getUserMedia(
      // Constraints
      self.state.mediaConstraints,

      // Success Callback
      function(stream) {

        // Get a reference to the video element on the page.
        var video = document.getElementById('camera-stream');

        
        var recordRTC = self.state.recordRTC;
        recordRTC.stopRecording(function(audioVideoWebURL) {
          var recordedBlob = self.state.recordedBlob;

          // Get a reference to the video element on the page.
          var video = document.getElementById('camera-stream');

          // Create an object URL for the video stream and use this 
          // to set the video source.
          video.src = audioVideoWebURL;         
          

          // the conversion is done here
          recordedBlob = recordRTC.getBlob();
          recordedBlob.lastModifiedDate = new Date();
          recordedBlob.name = 'VideoTest.webm';

          //and then we push the newly created file back into 
          //our App state
          self.updateRecordedBlob(recordedBlob);        
          self.state.stream.stop();
        });
        self.stopVideoCapture();
      },

      // Error Callback
      function(err) {
        // Log the error to the console.
        console.log('The following error occurred when trying to use getUserMedia: ' + err);
      }
    );
  },

  cleanAfterUpload() {
    this.refs.buttonUpload.style.display = 'none';
  },

  /*
    Helper functions, for handling events
  */

  // This is called when the user clicks on the upload button
  // after having recorded a video
  handleClick() {
    if(this.state.uploadVideo != '') {
      this.state.uploadVideo.handleUploadClick();
    } else {
      setTimeout(this.handleClick, 100);
    }
  },
  // This allows us to save the video infos to our App state
  // whenever the title, description or privacy status are
  // modified
  handleOnChange(event) {
    var title = this.refs.titleVideo.value;
    var desc = this.refs.descVideo.value;
    var privacy = this.refs.privacyVideo.value;
    this.saveVideoInfos.bind(this, title, desc, privacy)();
  },

  // Handles calling saveVideoId and 
  // checks whether video is available from youtube servers

  handleVideoId(videoId) {
    console.log(videoId);
    console.log('video id handled');
    this.saveVideoId.bind(this, videoId)();
    this.saveYoutubeUrl.bind(this, videoId)();
    this.checkIfVideoUploaded();
  },
  checkIfVideoUploaded() {
    var self = this;
    var video = self.state.youtubeVideoUrl;

    fetch(video, {mode:'no-cors'})
    .then(function(response) {
      self.refs.youtubeFrame.src = self.state.youtubeVideoEmbed;
    })
    .catch(function(error) {
      console.log(error.message);
    })
  },
  // =======>>>>TODO: 
  // This method is called whenever the user clicks on the cancel
  // button
  
  cancelVideo() {
    this.stopVideoCapture();
  },

  stopVideoCapture() {
    var tracks = this.state.stream.getTracks();
    tracks[0].stop();
    tracks[1].stop();    
  },
  
  render() {
    return(
      <div>
        <div ref='record' className='record'>
          <div className='record-button-container'>
            <i onClick={this.renderVideo} className="fa fa-video-camera" aria-hidden="true"></i>
          </div>
        </div>          
        <div ref='video' id='video-container' >
          <video ref='cameraStream' id='camera-stream' width='1281px' autoPlay ></video>
          <div onClick={this.cancelVideo} ref='' className='button-cancel'>x</div>
          <button ref='buttonRecord'onClick={this.recordVideo} className='button-record'>Record</button>
          <button ref='buttonStop' onClick={this.stopRecording} className='button-stop' >Stop</button>
          <button ref='buttonUpload' onClick={this.handleClick} id='button-upload'>Upload Video</button>
          <div ></div>
          <div>
            <label className='labels-upload' htmlFor="title-upload">Title:</label>
            <input onChange={this.handleOnChange} ref='titleVideo' id="titleVideo" type="text" defaultValue=''/>
          </div>
          <div>
            <label className='labels-upload' htmlFor="description">Description:</label>
            <textarea onChange={this.handleOnChange} ref='descVideo' id='descVideo' defaultValue=''></textarea>
          </div>
          <div>
            <label className='labels-upload' htmlFor="privacy-status">Privacy Status:</label>
            <select onChange={this.handleOnChange} ref='privacyVideo' id='privacyVideo'>
              <option>public</option>
              <option>unlisted</option>
              <option>private</option>
            </select>
          </div>          
        </div>
        <div ref='youtubeVideo' id='show-video-from-youtube'>
          <iframe ref='youtubeFrame' width="420" height="315" src="" frameBorder="0" allowFullScreen></iframe>
        </div>        
      </div>
      
    )
  }
} );