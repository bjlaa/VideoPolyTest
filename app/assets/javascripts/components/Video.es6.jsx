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
      titleVideo: 'user_id+access_token',
      descVideo: 'user_id+access_token',
      privacyVideo: 'public',
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
  saveRecordRTC(recordRTC) {
    this.setState({recordRTC: recordRTC});
  },
  updateRecordedBlob(updatedBlob) {
    this.setState({recordedBlob: updatedBlob});
  },
  saveVideoId(videoId) {
    this.setState({videoId: videoId});
  },
  saveYoutubeUrl(videoId) {
    this.setState({
      youtubeVideoEmbed: 'https://www.youtube.com/embed/'+videoId,
      youtubeVideoUrl: 'https://www.youtube.com/watch?v='+videoId
    });
  },
  updateStream(stream) {
    this.setState({
      stream: stream
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
        onComplete: function(data) {
          console.log('Upload complete');
          var uploadResponse = JSON.parse(data);
          this.videoId = uploadResponse.id;

          // Takes care of calling our saveVideoId method
          // that allows us to stock our video ID in order
          // to display it afterwards
          var videoIdVar = this.videoId;
          self.handleVideoId.bind(null, videoIdVar)();

          // Hides upload video div and show our 
          // fetched youtube video

        }.bind(this)
      });
      this.uploadStartTime = Date.now();
      uploader.upload(); 
      
    }

    this.handleUploadClick = function() {
      if(self.state.recordedBlob) {
        this.uploadFile(self.state.recordedBlob);
      } else {
        setTimeout(function() {
          self.handleUploadTimeout();
        }, 300);
      }
      
    }
  },
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
    });
    // After authentication is complete, we set up the future
    // upload
    this.createUploadClass();
  },



  /*
    Starting the capture and rendering its stream to our video div
  */


  // This is called when the user clicks on the camera icon
  // starting the video capture by the device's camera/ microphone 
  renderVideo() {
    this.refs.video.style.display = 'block';
    this.refs.recordIcon.style.display = 'none';
    this.captureVideoAudio();
  },

  // This method only turns on the device's camera and microphone
  // and transmit their stream 'localMediaStream' to our video div
  captureVideoAudio() {
    this.refs.cameraStream.controls = false;
    this.refs.buttonRecord.style.display= 'initial';

    this.refs.cameraStream.muted = true;
    navigator.getUserMedia = (navigator.getUserMedia ||
                              navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia || 
                              navigator.msGetUserMedia);
    var self = this;
    if (navigator.getUserMedia) {
      // Request the camera.
      navigator.getUserMedia(
        // Constraints
        self.state.mediaConstraints,

        // Success Callback
        function(stream) {
          self.saveStreamData(stream);

          //Rendering video on screen part

          // Get a reference to the video element on the page.
          var video = document.getElementById('camera-stream');

          // Create an object URL for the video stream and use this 
          // to set the video source.
          video.src = window.URL.createObjectURL(stream);
          self.updateStream(stream);
          
        },

        // Error Callback
        function(err) {
          // Log the error to the console.
          console.log('The following error occurred when trying to use getUserMedia: ' + err);
        }
      );

    } else {
      alert('Sorry, your browser does not support getUserMedia');
      this.refs.video.style.display = "none";
    }   
  },


  /*
    Recording of our video
  */

  // This method is called when the user clicks on the record 
  // button: it gets the stream from 'localMediaStream' and 
  // stores it in our App state with saveRecordRTC
  recordVideo() {
    this.refs.buttonCancel.style.display = 'none';
    this.refs.buttonRecord.style.display= 'none';
    this.refs.buttonStop.style.display= 'initial';
    var self = this;

    

    navigator.getUserMedia(

      // Constraints
      self.state.mediaConstraints,

      // Success Callback
      function(stream) {
        //RecordRTC part - recording of the video

        // Get a reference to the video element on the page.
        var video = document.getElementById('camera-stream');
        video.src = window.URL.createObjectURL(stream);

        var options = {
          mimeType: 'video/webm',
          bitsPerSecond: 1200000,
          bufferSize: 16384,
          sampleRate: 96000
        };
        var recordRTC = RecordRTC(stream, options);
        self.saveRecordRTC(recordRTC);
        self.state.recordRTC.startRecording();
        self.stopVideoCapture();
        self.updateStream(stream);
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
    this.refs.cameraStream.controls = true;
    this.refs.buttonStop.style.display= 'none';
    this.refs.cameraStream.muted = false;
    this.refs.cameraStream.autoPlay = 'disabled';

    var video = document.getElementById('camera-stream');
    video.muted = false;
    

    var self = this;

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
        });
        self.stopVideoCapture();
        self.updateStream(stream);
      },

      // Error Callback
      function(err) {
        // Log the error to the console.
        console.log('The following error occurred when trying to use getUserMedia: ' + err);
      }
    );

    this.handleUploadTimeout();
    this.refs.buttonCancel.style.display = 'block';
  },

  /*
    Helper functions, for handling events
  */

  // This is called when the user clicks on the upload button
  // after having recorded a video
  handleUploadTimeout() {
    if(this.state.uploadVideo != '') {
      this.state.uploadVideo.handleUploadClick();
    } else {
      setTimeout(this.handleUploadTimeout, 100);
    }
  },

  // Handles calling saveVideoId and 
  // checks whether video is available from youtube servers

  handleVideoId(videoId) {
    this.saveVideoId.bind(null, videoId)();
    this.saveYoutubeUrl.bind(null, videoId)();
  },
  
  cancelVideo() {
    this.stopVideoCapture();
    this.refs.video.style.display = 'none';
    this.refs.recordIcon.style.display = 'block';
  },

  stopVideoCapture() {
    var tracks = this.state.stream.getTracks();
    tracks[0].stop();
    tracks[1].stop();    
  },
  
  render() {
    return(
      <div>
        <div ref='recordIcon' className='record'>
          <div className='record-button-container'>
            <i onClick={this.renderVideo} className="fa fa-camera" aria-hidden="true"></i>
          </div>
        </div>          
        <div ref='video' id='video-container' >
          <video ref='cameraStream' id='camera-stream' width='1281px' autoPlay ></video>
          <div onClick={this.cancelVideo} ref='buttonCancel' className='button-cancel'>x</div>
          <button ref='buttonRecord'onClick={this.recordVideo} className='button-record'></button>
          <button ref='buttonStop' onClick={this.stopRecording} className='button-stop' ></button>        
        </div>       
      </div>
    )
  }
} );