'use strict';
import * as lodash from 'lodash-es';

import { Storage } from '../storage/storage.js';

const { get: _get, set: _set, extend } = lodash;

/**
 *
 * Represents the event store data.
 *
 */
const EventStore = class {
  /**
   * Creates a new event store.
   * @param {string} options Event data.
   * @class
   */
  constructor(options) {
    this.eventStore = options.eventStore;
    this.eventStore['runtime'] = {};
    this.botName = options.botName;
  }

  /**
   * Function to get runtime information of events.
   * @param {array} path path of the event.
   * @param {any} defaultValue any default value.
   *
   * @return {object} Event data.
   */
  get(path, defaultValue) {
    if (path) {
      return _get(this.eventStore['runtime'], path, defaultValue);
    }

    return this.eventStore['runtime'] || defaultValue;
  }

  /**
   * Function to set runtime information of events.
   * @param {array} path path of the event.
   * @param {object} eventData event data to set.
   *
   * @return {object} Event data.
   */
  set(path, eventData) {
    _set(this.eventStore['runtime'], path, eventData);

    return this.get(path);
  }

  /**
   * Function to return schedule data.
   *
   * @return {object} Event data.
   */
  getSchedules() {
    return _get(this.eventStore, ['schedule']);
  }

  /**
   * Function to set schedule data.
   * @param {array} path path of the event.
   * @param {object} eventData event data to set.
   *
   * @return {object} Event data.
   */
  setSchedule(path, eventData) {
    _set(this.eventStore['schedule'], path, eventData);
    return this.getSchedule();
  }

  /**
   * Function to return event data.
   *
   * @return {object} Event data.
   */
  getEvents() {
    return _get(this.eventStore, ['events']);
  }

  /**
   * Function to set event data.
   * @param {array} path path of the event.
   * @param {object} eventData event data to set.
   *
   * @return {object} Event data.
   */
  setEvents(path, eventData) {
    _set(this.eventStore['events'], path, eventData);
    return this.getEvents();
  }

  /**
   * Function to update event data.
   * @param {string} options Type of event and id.
   * @param {object} data event data.
   *
   * @return {object} Event data.
   */
  update(options, data) {
    return Storage.updateEvents(
      extend({ botName: this.botName }, options),
      data
    ).then((eventData) => {
      this.eventStore[options.eventType] = eventData[this.botName];
      return eventData[this.botName];
    });
  }

  /**
   * Function to remove event data.
   * @param {string} options Type of event and id.
   * @param {object} data event data.
   *
   * @return {object} Event data.
   */
  remove(options, data) {
    return Storage.removeEvents(
      extend({ botName: this.botName }, options),
      data
    ).then((eventData) => {
      this.eventStore[options.eventType] = eventData[this.botName];
      return eventData[this.botName];
    });
  }
};

export { EventStore };
