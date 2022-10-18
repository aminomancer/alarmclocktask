// ==UserScript==
// @name           YouTube Shuffler
// @namespace      https://github.com/aminomancer
// @version        1.6.1
// @author         aminomancer
// @homepageURL    https://www.npmjs.com/package/alarmclocktask
// @supportURL     https://github.com/aminomancer/alarmclocktask/issues
// @downloadURL    https://cdn.jsdelivr.net/npm/alarmclocktask/youtube-shuffler.user.js
// @description    Automatically shuffles the YouTube playlist specified in
// @include. Just add %24 to the end of a video link in the playlist. Now the
// script won't run when you're watching the playlist as normal, but if you set
// a bookmark with this modified URL, it'll load the same page since the %24
// doesn't actually do anything. I use this with my alarm clock task
// (https://github.com/aminomancer/alarmclocktask) so I can use my YouTube
// playlist as an alarm clock. This script automatically shuffles it for me so
// it acts as an alarm clock, rather than just playing the same order of videos
// every day. The URL can't be the playlist itself. It has to be a player URL in
// order for it to autoplay, so the URL should have "v" and "list" and "index"
// query terms. Click a video in your playlist to get the right kind of URL.
// @include        *://*.youtube.com/watch?v=*&list=*%24
// @example        https://www.youtube.com/watch?v=*&list=*&index=1%24
// @run-at         document-idle
// @grant          none
// @icon           data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z' fill='white'/></svg>
// @license        This Source Code Form is subject to the terms of the Creative Commons Attribution-NonCommercial-ShareAlike International License, v. 4.0. If a copy of the CC BY-NC-SA 4.0 was not distributed with this file, You can obtain one at http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
// ==/UserScript==

/* eslint-env browser */
// TODO - Update with the safer version of this DOM searching code from WNPC:
window.setTimeout(() => {
  var intervalId = window.setInterval(() => {
    if (
      document.querySelector("#content #playlist-action-menu") &&
      document.querySelector("#ytd-player .ytp-next-button")
    ) {
      window.clearInterval(intervalId);
      requestAnimationFrame(() => {
        setTimeout(() => {
          setTimeout(() => {
            setTimeout(() => {
              document
                .querySelector("#content #playlist-action-menu")
                ?.children[0]?.children[0]?.children[0]?.children[0]?.children[0]?.click();
            }, 4500);
            document.querySelector("#ytd-player .ytp-next-button").click();
          }, 500);
          document
            .querySelector("#content #playlist-action-menu")
            ?.children[0]?.children[0]?.children[0]?.children[0]?.children[0]?.click();
        }, 1500);
        document
          .querySelector("#content #playlist-action-menu")
          ?.children[0]?.children[0]?.children[1]?.children[0]?.children[0]?.click();
      });
    }
  }, 300);
}, 1500);
