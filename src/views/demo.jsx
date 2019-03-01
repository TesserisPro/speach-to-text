/* eslint no-param-reassign: 0 */
import React, { Component } from 'react';
import {
  Icon, Alert,
} from 'watson-react-components';
import recognizeMicrophone from 'watson-speech/speech-to-text/recognize-microphone';


import ModelDropdown from './model-dropdown.jsx';
import cachedModels from '../data/models.json';
import AuthService from '../services/AuthService';
import Transcript from './transcript';

const robot = window.robot;

const ERR_MIC_NARROWBAND = 'Microphone transcription cannot accommodate narrowband voice models, please select a broadband one.';

let previousFinal = null;

export class Demo extends Component {
  constructor(props) {
    super();
    this.state = {
      model: 'en-US_BroadbandModel',
      formattedMessages: [],
      audioSource: null,
      speakerLabels: false,
      keywords: null,
      error: null,
      api_key: '<put your key here>',
      accessToken: null,
      serviceUrl: 'https://gateway-lon.watsonplatform.net/speech-to-text/api',
    };

    this.reset = this.reset.bind(this);
    this.stopTranscription = this.stopTranscription.bind(this);
    this.getRecognizeOptions = this.getRecognizeOptions.bind(this);
    this.isNarrowBand = this.isNarrowBand.bind(this);
    this.handleMicClick = this.handleMicClick.bind(this);
    this.handleStream = this.handleStream.bind(this);
    this.handleFormattedMessage = this.handleFormattedMessage.bind(this);
    this.handleTranscriptEnd = this.handleTranscriptEnd.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.supportsSpeakerLabels = this.supportsSpeakerLabels.bind(this);
    this.getFinalResults = this.getFinalResults.bind(this);
    this.getCurrentInterimResult = this.getCurrentInterimResult.bind(this);
    this.getFinalAndLatestInterimResult = this.getFinalAndLatestInterimResult.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  reset() {
    if (this.state.audioSource) {
      this.stopTranscription();
    }
    previousFinal = null;
    this.setState({ formattedMessages: [], error: null, audioSource: null });
  }


  stopTranscription() {
    if (this.stream) {
      this.stream.stop();
      this.stream.removeAllListeners();
      this.stream.recognizeStream.removeAllListeners();
    }
  }

  getRecognizeOptions() {
    return Object.assign({
      // formats phone numbers, currency, etc. (server-side)
      access_token: this.state.accessToken,
      token: this.state.token,
      smart_formatting: true,
      format: true, // adds capitals, periods, and a few other things (client-side)
      model: this.state.model,
      objectMode: true,
      interim_results: true,
      timestamps: true, // set timestamps for each word - automatically turned on by speaker_labels
      // includes the speaker_labels in separate objects unless resultsBySpeaker is enabled
      speaker_labels: this.state.speakerLabels,
      // combines speaker_labels and results together into single objects,
      // making for easier transcript outputting
      resultsBySpeaker: this.state.speakerLabels,
      // allow interim results through before the speaker has been determined
      speakerlessInterim: this.state.speakerLabels,
      url: this.state.serviceUrl,
    });
  }

  isNarrowBand(model) {
    model = model || this.state.model;
    return model.indexOf('Narrowband') !== -1;
  }


  async handleMicClick() {
    try {
      if (this.state.audioSource) {
        this.reset();
        return;
      } else {
        await this.fetchToken();
        // this.reset();
        this.setState({ audioSource: true, error: null });

        this.handleStream(recognizeMicrophone(this.getRecognizeOptions()));
      }
    } catch (err) {
      this.handleError(err);
    }


  }


  handleStream(stream) {
    // cleanup old stream if appropriate
    if (this.stream) {
      this.stream.stop();
      this.stream.removeAllListeners();
      this.stream.recognizeStream.removeAllListeners();
    }
    this.stream = stream;

    // grab the formatted messages and also handle errors and such
    stream.on('data', this.handleFormattedMessage).on('end', this.handleTranscriptEnd).on('error', this.handleError);

    // when errors occur, the end event may not propagate through the helper streams.
    // However, the recognizeStream should always fire a end and close events
    stream.recognizeStream.on('end', () => {
      if (this.state.error) {
        this.handleTranscriptEnd();
      }
    });

  }


  handleFormattedMessage(msg) {
    const { formattedMessages } = this.state;
    this.setState({ formattedMessages: formattedMessages.concat(msg) });
  }

  handleTranscriptEnd() {
    // note: this function will be called twice on a clean end,
    // but may only be called once in the event of an error
    previousFinal = null;
    this.setState({ audioSource: null });
  }

  async fetchToken() {
    try {
      const creds = {
        api_key: this.state.api_key,
        serviceUrl: this.state.serviceUrl,
      };
      const { accessToken } = await AuthService.getToken(creds);
      this.setState({ accessToken: accessToken });
    } catch (err) {
      throw new Error(err);
    }
  }


  handleModelChange(model) {
    this.reset();
    this.setState({
      model,
      speakerLabels: this.supportsSpeakerLabels(model),
    });

    // clear the microphone narrowband error if it's visible and a broadband model was just selected
    if (this.state.error === ERR_MIC_NARROWBAND && !this.isNarrowBand(model)) {
      this.setState({ error: null });
    }

    // clear the speaker_lables is not supported error - e.g.
    // speaker_labels is not a supported feature for model en-US_BroadbandModel
    if (this.state.error && this.state.error.indexOf('speaker_labels is not a supported feature for model') === 0) {
      this.setState({ error: null });
    }
  }

  supportsSpeakerLabels(model) {
    model = model || this.state.model;
    // todo: read the upd-to-date models list instead of the cached one
    return cachedModels.some(m => m.name === model && m.supported_features.speaker_labels);
  }

  getFinalResults() {
    return this.state.formattedMessages.filter(r => r.results
      && r.results.length && r.results[0].final);
  }

  getCurrentInterimResult() {
    const r = this.state.formattedMessages[this.state.formattedMessages.length - 1];
    if (!r || !r.results || !r.results.length || r.results[0].final) {
      return null;
    }
    return r;
  }

  getFinalAndLatestInterimResult() {
    const final = this.getFinalResults();
    const interim = this.getCurrentInterimResult();

    if (interim) {
      final.push(interim);
    }

    function prepareFinalString(interim) {
      return interim.results.map(r => {
        return r.alternatives[0].transcript;
      }).join();
    }
    const currentResult = final[final.length - 1];
    if (currentResult) {

      if (!previousFinal || !previousFinal.length) {
        robot.typeString(prepareFinalString(currentResult));
      }
      if (previousFinal && previousFinal.length) {
        const previousResult = previousFinal[previousFinal.length - 1];
        if (previousResult && final.length !== previousFinal.length) {
          robot.typeString(prepareFinalString(currentResult));
        } else if (previousResult && final.length === previousFinal.length) {
          const removedString = prepareFinalString(previousResult);
          const currentString = prepareFinalString(currentResult);
          if (removedString !== currentString) {
            for (let i = 0; i < removedString.length; i++) {
              robot.keyTap('backspace');
            }
            robot.typeString(currentString);
          }
        }
      }
    }
    previousFinal = final;
    return final;
  }

  handleError(err, extra) {
    console.info(err, extra);
    if (err.name === 'UNRECOGNIZED_FORMAT') {
      err = 'Unable to determine content type from file name or header; mp3, wav, flac, ogg, opus, and webm are supported. Please choose a different file.';
    } else if (err.name === 'NotSupportedError' && this.state.audioSource) {
      err = 'This browser does not support microphone input.';
    } else if (err.message === '(\'UpsamplingNotAllowed\', 8000, 16000)') {
      err = 'Please select a narrowband voice model to transcribe 8KHz audio files.';
    } else if (err.message === 'Invalid constraint') {
      // iPod Touch does this on iOS 11 - there is a microphone, but Safari claims there isn't
      err = 'Unable to access microphone';
    }
    this.setState({ error: err.message || err });
  }

  handleChange(e) {
    const name = e.target.name;
    const value = e.target.value;
    this.setState({ [name]: value });

  }

  render() {
    const {
      token, accessToken, audioSource, error, model
    } = this.state;

    let micButtonClass = 'start-button';
    if (audioSource) {
      micButtonClass += ' mic-active';
    } else if (!recognizeMicrophone.isSupported) {
      micButtonClass += ' base--button_black';
    }

    const err = error
      ? (
        <Alert type="error" color="red">
          <p className="base--p">
            {error}
          </p>
        </Alert>
      )
      : null;

    const messages = this.getFinalAndLatestInterimResult();
    return (
      <div className="container">


        <header className="header">
          <h2 className="header__title">IBM Watson Dictation</h2>
        </header>

        <form className="form-control">
          <div className="form-control__row">
            <label htmlFor="api_key">API Key:</label>
            <input id="api_key" name="api_key" type="text" value={this.state.api_key} onChange={this.handleChange} />
          </div>
          <div className="form-control__row">
            <label htmlFor="serviceUrl">URL:</label>
            <input id="serviceUrl" name="serviceUrl" type="text" value={this.state.serviceUrl} onChange={this.handleChange} />
          </div>
        </form>

        <form className="form-control">
          <div className="form-control__row">
            <label htmlFor="">Language</label>
            <ModelDropdown
              model={model}
              token={token || accessToken}
              onChange={this.handleModelChange}
            />
          </div>
        </form>

        <div className="flex buttons">

          <span onClick={this.handleMicClick} disabled={!this.state.api_key || !this.state.serviceUrl} className={micButtonClass}>
            {audioSource ? 'Stop' : 'Start'}
          </span>

        </div>
        {err}
        {/* <Transcript messages={messages} /> */}
      </div>
    );
  }
};

export default Demo;