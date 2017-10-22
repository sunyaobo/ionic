import { Component, Element, Event, EventEmitter, Prop, State } from '@stencil/core';

// import { GESTURE_PRIORITY_REFRESHER, GESTURE_REFRESHER, GestureController, GestureDelegate } from '../../gestures/gesture-controller';
// import { isTrueProperty } from '../../util/util';
// import { Platform } from '../../platform/platform';
// import { pointerCoord } from '../../util/dom';
// import { PointerEvents } from '../../gestures/pointer-events';
// import { UIEventManager } from '../../gestures/ui-event-manager';


const enum RefresherState {
  Inactive = 1 << 0,
  Pulling = 1 << 1,
  Ready = 1 << 2,
  Refreshing = 1 << 3,
  Cancelling = 1 << 4,
  Completing = 1 << 5,

  _BUSY_ = Refreshing | Cancelling | Completing,
}

/**
 * @name Refresher
 * @description
 * The Refresher provides pull-to-refresh functionality on a content component.
 * Place the `ion-refresher` as the first child of your `ion-content` element.
 *
 * Pages can then listen to the refresher's various output events. The
 * `refresh` output event is fired when the user has pulled down far
 * enough to kick off the refreshing process. Once the async operation
 * has completed and the refreshing should end, call `complete()`.
 *
 * Note: Do not wrap the `ion-refresher` in a `*ngIf`. It will not render
 * properly this way. Please use the `enabled` property instead to
 * display or hide the refresher.
 *
 * @usage
 * ```html
 * <ion-content>
 *
 *   <ion-refresher (ionRefresh)="doRefresh($event)">
 *     <ion-refresher-content></ion-refresher-content>
 *   </ion-refresher>
 *
 * </ion-content>
 * ```
 *
 * ```ts
 * @Component({...})
 * export class NewsFeedPage {
 *
 *   doRefresh(refresher) {
 *     console.log('Begin async operation', refresher);
 *
 *     setTimeout(() => {
 *       console.log('Async operation has ended');
 *       refresher.complete();
 *     }, 2000);
 *   }
 *
 * }
 * ```
 *
 *
 * ## Refresher Content
 *
 * By default, Ionic provides the pulling icon and refreshing spinner that
 * looks best for the platform the user is on. However, you can change the
 * default icon and spinner, along with adding text for each state by
 * adding properties to the child `ion-refresher-content` component.
 *
 *  ```html
 *  <ion-content>
 *
 *    <ion-refresher (ionRefresh)="doRefresh($event)">
 *      <ion-refresher-content
 *        pullingIcon="arrow-dropdown"
 *        pullingText="Pull to refresh"
 *        refreshingSpinner="circles"
 *        refreshingText="Refreshing...">
 *      </ion-refresher-content>
 *    </ion-refresher>
 *
 *  </ion-content>
 *  ```
 *
 *
 * ## Further Customizing Refresher Content
 *
 * The `ion-refresher` component holds the refresh logic.
 * It requires a child component in order to display the content.
 * Ionic uses `ion-refresher-content` by default. This component
 * displays the refresher and changes the look depending
 * on the refresher's state. Separating these components
 * allows developers to create their own refresher content
 * components. You could replace our default content with
 * custom SVG or CSS animations.
 *
 * @demo /docs/demos/src/refresher/
 *
 */
@Component({
  tag: 'ion-refresher',
  styleUrl: 'refresher.scss'
})
export class Refresher {

  private appliedStyles: boolean = false;
  private didStart: boolean = false;
  scrollEl: HTMLElement;

  /**
   * The current state which the refresher is in. The refresher's states include:
   *
   * - `inactive` - The refresher is not being pulled down or refreshing and is currently hidden.
   * - `pulling` - The user is actively pulling down the refresher, but has not reached the point yet that if the user lets go, it'll refresh.
   * - `cancelling` - The user pulled down the refresher and let go, but did not pull down far enough to kick off the `refreshing` state. After letting go, the refresher is in the `cancelling` state while it is closing, and will go back to the `inactive` state once closed.
   * - `ready` - The user has pulled down the refresher far enough that if they let go, it'll begin the `refreshing` state.
   * - `refreshing` - The refresher is actively waiting on the async operation to end. Once the refresh handler calls `complete()` it will begin the `completing` state.
   * - `completing` - The `refreshing` state has finished and the refresher is in the process of closing itself. Once closed, the refresher will go back to the `inactive` state.
   */
  @State() state: RefresherState = RefresherState.Inactive;


  /**
   * A number representing how far down the user has pulled.
   * The number `0` represents the user hasn't pulled down at all. The
   * number `1`, and anything greater than `1`, represents that the user
   * has pulled far enough down that when they let go then the refresh will
   * happen. If they let go and the number is less than `1`, then the
   * refresh will not happen, and the content will return to it's original
   * position.
   */
  progress: number = 0;

  @Element() el: HTMLElement;

  /**
   * @input {number} The min distance the user must pull down until the
   * refresher can go into the `refreshing` state. Default is `60`.
   */
  @Prop() pullMin: number = 60;

  /**
   * @input {number} The maximum distance of the pull until the refresher
   * will automatically go into the `refreshing` state. By default, the pull
   * maximum will be the result of `pullMin + 60`.
   */
  @Prop() pullDelta: number = 60;

  // TODO: NEVER USED
  /**
   * @input {number} Time it takes to close the refresher. Default is `280ms`.
   */
  @Prop() closeDuration: string = '280ms';

  /**
   * @input {string} Time it takes the refresher to to snap back to the `refreshing` state. Default is `280ms`.
   */
  @Prop() snapbackDuration: string = '280ms';

  /**
   * @input {boolean} If the refresher is enabled or not. This should be used in place of an `ngIf`. Default is `true`.
   */
  @Prop() enabled: boolean = false;

  /**
   * @output {event} Emitted when the user lets go and has pulled down
   * far enough, which would be farther than the `pullMin`, then your refresh hander if
   * fired and the state is updated to `refreshing`. From within your refresh handler,
   * you must call the `complete()` method when your async operation has completed.
   */
  @Event() ionRefresh: EventEmitter;

  /**
   * @output {event} Emitted while the user is pulling down the content and exposing the refresher.
   */
  @Event() ionPull: EventEmitter;

  /**
   * @output {event} Emitted when the user begins to start pulling down.
   */
  @Event() ionStart: EventEmitter;


  protected ionViewDidLoad() {
      //   _content._hasRefresher = true;

    // bind event listeners
    // save the unregister listener functions to use onDestroy
    this.scrollEl = this.el.closest('ion-scroll') as HTMLElement;
    // if (this.contentEl._hasRefresher = true;) {
    //   this.contentEl._hasRefresher = true;
    // }
  }

  protected ionViewDidUnload() {
    this.scrollEl = null;
  }

  private canStart(detail: any): boolean {
    const ev = detail.event;
    if (ev.touches && ev.touches.length > 1) {
      return false;
    }
    if (this.state !== RefresherState.Inactive) {
      return false;
    }

    const scrollHostScrollTop = this.scrollEl.scrollTop;
    // if the scrollTop is greater than zero then it's
    // not possible to pull the content down yet
    if (scrollHostScrollTop > 0) {
      return false;
    }
    return true;
  }

  private onStart() {
    this.progress = 0;
    this.state = RefresherState.Inactive;
  }

  private onMove(detail: any) {
    // this method can get called like a bazillion times per second,
    // so it's built to be as efficient as possible, and does its
    // best to do any DOM read/writes only when absolutely necessary
    // if multitouch then get out immediately
    const ev = detail.event;
    if (ev.touches && ev.touches.length > 1) {
      return 1;
    }

    // do nothing if it's actively refreshing
    // or it's in the process of closing
    // or this was never a startY
    if (this.state & RefresherState._BUSY_) {
      return 2;
    }

    const deltaY = detail.deltaY;
    // don't bother if they're scrolling up
    // and have not already started dragging
    if (deltaY <= 0) {
      // the current Y is higher than the starting Y
      // so they scrolled up enough to be ignored
      this.progress = 0;
      this.state = RefresherState.Inactive;

      if (this.appliedStyles) {
        // reset the styles only if they were applied
        this.setCss(0, '', false, '');
        return 5;
      }

      return 6;
    }

    if (this.state === RefresherState.Inactive) {
      // this refresh is not already actively pulling down
      // get the content's scrollTop
      let scrollHostScrollTop = this.scrollEl.scrollTop;

      // if the scrollTop is greater than zero then it's
      // not possible to pull the content down yet
      if (scrollHostScrollTop > 0) {
        this.progress = 0;
        return 7;
      }

      // content scrolled all the way to the top, and dragging down
      this.state = RefresherState.Pulling;
    }

    // prevent native scroll events
    ev.preventDefault();

    // the refresher is actively pulling at this point
    // move the scroll element within the content element
    this.setCss(deltaY, '0ms', true, '');

    if (!deltaY) {
      // don't continue if there's no delta yet
      this.progress = 0;
      return 8;
    }

    const pullMin = this.pullMin;
    // set pull progress
    this.progress = deltaY / pullMin;

    // emit "start" if it hasn't started yet
    if (!this.didStart) {
      this.didStart = true;
      this.ionStart.emit(this);
    }

    // emit "pulling" on every move
    this.ionPull.emit(this);

    // do nothing if the delta is less than the pull threshold
    if (deltaY < pullMin) {
      // ensure it stays in the pulling state, cuz its not ready yet
      this.state = RefresherState.Pulling;
      return 2;
    }

    if (deltaY > pullMin + this.pullDelta) {
      // they pulled farther than the max, so kick off the refresh
      this.beginRefresh();
      return 3;
    }

    // pulled farther than the pull min!!
    // it is now in the `ready` state!!
    // if they let go then it'll refresh, kerpow!!
    this.state = RefresherState.Ready;

    return 4;
  }

  private onEnd() {
    // only run in a zone when absolutely necessary
    if (this.state === RefresherState.Ready) {
      // they pulled down far enough, so it's ready to refresh
      this.beginRefresh();

    } else if (this.state === RefresherState.Pulling) {
      // they were pulling down, but didn't pull down far enough
      // set the content back to it's original location
      // and close the refresher
      // set that the refresh is actively cancelling
      this.cancel();
    }
  }

  private beginRefresh() {
    // assumes we're already back in a zone
    // they pulled down far enough, so it's ready to refresh
    this.state = RefresherState.Refreshing;

    // place the content in a hangout position while it thinks
    this.setCss(this.pullMin, this.snapbackDuration, true, '');

    // emit "refresh" because it was pulled down far enough
    // and they let go to begin refreshing
    this.ionRefresh.emit(this);
  }

  /**
   * Call `complete()` when your async operation has completed.
   * For example, the `refreshing` state is while the app is performing
   * an asynchronous operation, such as receiving more data from an
   * AJAX request. Once the data has been received, you then call this
   * method to signify that the refreshing has completed and to close
   * the refresher. This method also changes the refresher's state from
   * `refreshing` to `completing`.
   */
  complete() {
    this.close(RefresherState.Completing, '120ms');
  }

  /**
   * Changes the refresher's state from `refreshing` to `cancelling`.
   */
  cancel() {
    this.close(RefresherState.Cancelling, '');
  }

  private close(state: RefresherState, delay: string) {
    var timer: number;

    function close(ev: TransitionEvent) {
      // closing is done, return to inactive state
      if (ev) {
        clearTimeout(timer);
      }

      this.state = RefresherState.Inactive;
      this.progress = 0;
      this.didStart = false;
      this.setCss(0, '0ms', false, '');
    }

    // create fallback timer incase something goes wrong with transitionEnd event
    timer = setTimeout(close.bind(this), 600);

    // create transition end event on the content's scroll element
    // TODO: what is this?
    // this.scrollEl.onScrollElementTransitionEnd(close.bind(this));

    // reset set the styles on the scroll element
    // set that the refresh is actively cancelling/completing
    this.state = state;
    this.setCss(0, '', true, delay);

    // TODO: stop gesture
    // if (this._pointerEvents) {
    //   this._pointerEvents.stop();
    // }
  }

  private setCss(y: number, duration: string, overflowVisible: boolean, delay: string) {
    this.appliedStyles = (y > 0);
    Context.dom.write(() => {
      const style = this.scrollEl.style;
      style.transform = ((y > 0) ? 'translateY(' + y + 'px) translateZ(0px)' : 'translateZ(0px)');
      style.transitionDuration = duration;
      style.transitionDelay = delay;
      style.overflow = (overflowVisible ? 'hidden' : '');
    });
  }

  protected hostData() {
    return {
      class: {
        'refresher-active': this.state !== RefresherState.Inactive,
        'refresher-pulling': this.state === RefresherState.Pulling,
        'refresher-ready': this.state === RefresherState.Ready,
        'refresher-refreshing': this.state === RefresherState.Refreshing,
        'refresher-cancelling': this.state === RefresherState.Cancelling,
        'refresher-completing': this.state === RefresherState.Completing
      }
    };
  }

  protected render() {
    return <ion-gesture props={{
      'canStart': this.canStart.bind(this),
      'onStart': this.onStart.bind(this),
      'onMove': this.onMove.bind(this),
      'onEnd': this.onEnd.bind(this),
      'enabled': this.enabled,
      'gestureName': 'refresher',
      'gesturePriority': 10,
      'type': 'pan',
      'direction': 'y',
      'threshold': 0,
      'attachTo': 'body'
    }}>
      <slot></slot>
    </ion-gesture>;
  }
}