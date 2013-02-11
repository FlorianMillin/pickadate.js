/*!
 * pickadate.js v3.0.0 early unstable pre-aplha build - 11 February, 2013
 * By Amsul (http://amsul.ca)
 * Hosted on https://github.com/amsul/pickadate.js
 * Licensed under MIT ("expat" flavour) license.
 */

/*jshint
   debug: true,
   devel: true,
   browser: true,
   asi: true,
   unused: true,
   eqnull: true
 */



;(function( $, document, undefined ) {

    'use strict';



    var

        // Globals & constants
        DAYS_IN_WEEK = 7,
        WEEKS_IN_CALENDAR = 6,
        DAYS_IN_CALENDAR = WEEKS_IN_CALENDAR * DAYS_IN_WEEK,

        MINUTES_IN_HOUR = 60,
        HOURS_IN_DAY = 24,
        MINUTES_IN_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR,

        STRING_DIV = 'div',
        STRING_PREFIX_DATEPICKER = 'pickadate__',

        isIE = navigator.userAgent.match( /MSIE/ ),

        $document = $( document ),


        /**
         * The picker constructor that creates and returns a new date or time picker
         */
        Picker = function( $ELEMENT, SETTINGS, IS_TIME_PICKER ) {

            var
                // Pseudo picker constructor
                Picker = function() {},


                // The picker prototype
                P = Picker.prototype = {

                    constructor: Picker,

                    $node: $ELEMENT,

                    /**
                     * Initialize everything
                     */
                    init: function() {


                        // Bind all the events to the element,
                        // and then insert everything after it
                        $ELEMENT.on({
                            'focus click': function() {

                                // If it's not IE or it is IE and the calendar is not
                                // being force closed, then open the calendar
                                if ( !isIE || ( isIE && !PICKER._IE ) ) {
                                    P.open()
                                }

                                // Add the focused state to the holder
                                $HOLDER.addClass( CLASSES.focused )

                                // Then flip the IE force close to false
                                PICKER._IE = 0
                            },
                            blur: function() {
                                $HOLDER.removeClass( CLASSES.focused )
                            },
                            change: function() {

                                // If there's a hidden input, update the value with formatting or clear it
                                if ( ELEMENT_HIDDEN ) {
                                    ELEMENT_HIDDEN.value = ELEMENT.value ? getTimeFormatted( SETTINGS.formatSubmit ) : ''
                                }
                            },
                            keydown: function( event ) {

                                var
                                    // Grab the keycode
                                    keycode = event.keyCode,

                                    // Check if one of the delete keys was pressed
                                    isKeycodeDelete = keycode == 8 || keycode == 46

                                // If backspace was pressed or the calendar is closed and the keycode
                                // warrants a date change, prevent it from going any further.
                                if ( isKeycodeDelete || !PICKER.isOpen && KEYCODE_TO_DATE[ keycode ] ) {

                                    // Prevent it from moving the page
                                    event.preventDefault()

                                    // Prevent it from propagating to document
                                    eventPreventPropagation( event )

                                    // If backspace was pressed, clear the values and close the picker
                                    if ( isKeycodeDelete ) {
                                        P.clear().close()
                                    }

                                    // Otherwise open the calendar
                                    else {
                                        P.open()
                                    }
                                }
                            }
                        }).after( [ $HOLDER, ELEMENT_HIDDEN ] )


                        // If the element has autofocus, open the calendar
                        if ( ELEMENT.autofocus ) {
                            P.open()
                        }


                        // Update the calendar items
                        PICKER.items = getUpdatedCalendarItems()


                        // Trigger the `onStart` method within scope of the picker
                        triggerFunction( SETTINGS.onStart, P )


                        return P
                    }, //init


                    /**
                     * Open the calendar
                     */
                    open: function() {

                        // If it's already open, do nothing
                        if ( PICKER.isOpen ) return P


                        // Set calendar as open
                        PICKER.isOpen = 1


                        // Toggle the tabindex of "focusable" calendar items
                        toggleCalendarElements( 0 )


                        // Make sure the element has focus and then
                        // add the "active" class to the element
                        $ELEMENT.focus().addClass( CLASSES.inputActive )

                        // Add the "opened" class to the calendar holder
                        $HOLDER.addClass( CLASSES.opened )


                        // Bind all the events to the document
                        // while namespacing it with the calendar ID
                        $document.on( 'focusin.P' + PICKER.id, function( event ) {

                            // If the target is not within the holder,
                            // and is not the element, then close the picker
                            if ( !$HOLDER.find( event.target ).length && event.target != ELEMENT ) P.close()

                        }).on( 'click.P' + PICKER.id, function( event ) {

                            // If the target of the click is not the element,
                            // then close the calendar picker
                            // * We don't worry about clicks on the holder
                            //   because those are stopped from bubbling to the doc
                            if ( event.target != ELEMENT ) P.close()

                        }).on( 'keydown.P' + PICKER.id, function( event ) {

                            var
                                // Get the keycode
                                keycode = event.keyCode,

                                // Translate that to a date change
                                keycodeToDate = KEYCODE_TO_DATE[ keycode ]


                            // On escape, focus back onto the element and close the picker
                            if ( keycode == 27 ) {
                                ELEMENT.focus()
                                P.close()
                            }


                            // If the target is the element and there's a keycode to date
                            // translation or the enter key was pressed
                            else if ( event.target == ELEMENT && ( keycodeToDate || keycode == 13 ) ) {

                                // Prevent the default action to stop it from moving the page
                                event.preventDefault()

                                // If the keycode translates to a date change, superficially select
                                // the date by incrementally (by date change) creating new validated dates.
                                // * Truthy second argument makes it a superficial selection
                                if ( keycodeToDate ) {
                                    setTimeSelected( createValidatedDate( [ TIME_FOCUSED.YEAR, TIME_FOCUSED.MONTH, TIME_HIGHLIGHTED.DATE + keycodeToDate ], keycodeToDate ), 1 )
                                }

                                // Otherwise it's the enter key so set the element value as the
                                // highlighted date, render a new calendar, and then close it
                                else {
                                    setElementsValue( TIME_HIGHLIGHTED )
                                    calendarRender()
                                    P.close()
                                }

                            } //if ELEMENT
                        })


                        // Trigger the onOpen method within scope of the picker
                        triggerFunction( SETTINGS.onOpen, P )

                        return P
                    }, //open


                    /**
                     * Close the calendar
                     */
                    close: function() {

                        // If it's already closed, do nothing
                        if ( !PICKER.isOpen ) return P


                        // Set calendar as closed
                        PICKER.isOpen = 0


                        // Toggle the tabindex of "focusable" calendar items
                        toggleCalendarElements( -1 )


                        // Remove the "active" class from the element
                        $ELEMENT.removeClass( CLASSES.inputActive )

                        // Remove the "opened" class from the calendar holder
                        $HOLDER.removeClass( CLASSES.opened )


                        // Unbind the Picker events from the document
                        $document.off( '.P' + PICKER.id )


                        // Trigger the onClose method within scope of the picker
                        triggerFunction( SETTINGS.onClose, P )

                        return P
                    }, //close


                    /**
                     * Show a month in focus with 0index compensation
                     */
                    show: function( month, year ) {
                        showMonth( --month, year )
                        return P
                    }, //show


                    /**
                     * Clear the value of the input elements
                     */
                    clear: function() {

                        // Clear the elements value
                        setElementsValue( 0 )

                        // Render a new calendar
                        calendarRender()

                        return P
                    }, //clear


                    /**
                     * Get the selected date in any format.
                     */
                    getDate: function( format ) {

                        // If the format is a literal true, return the underlying JS Date object.
                        // If the element has no value, just return an empty string.
                        // Otherwise return the formatted date.
                        return format === true ? TIME_SELECTED.OBJ : !ELEMENT.value ? '' : getTimeFormatted( format )
                    }, //getDate


                    /**
                     * Set the time with an options to do a superficial selection
                     */
                    set: function( timeArray, isSuperficial ) {

                        // If there's no time, we need to clear the value
                        if ( !timeArray ) {
                            setTimeSelected( createTimeObj( timeArray ), isSuperficial )
                        }

                        // If there are 2 units of time, set the time
                        else if ( timeArray.length == 2 ) {
                            setTimeSelected( createTimeObj( timeArray ), isSuperficial )
                        }

                        else {
                            // Compensate for month 0index and create a validated date.
                            // Then set it as the date selected
                            --timeArray[ 1 ]
                            setTimeSelected( createValidatedDate( timeArray ), isSuperficial )
                        }

                        return P
                    }, //set


                    /**
                     * Get the min or max date based on `upper` being truthy or falsey
                     */
                    getDateLimit: function( upper, format ) {
                        return getTimeFormatted( format, upper ? LIMIT_MAX : LIMIT_MIN )
                    }, //getDateLimit


                    /**
                     * Set the min or max date based on `upper` being truthy or falsey.
                     */
                    setDateLimit: function( limit, upper ) {

                        // If it's the upper limit
                        if ( upper ) {

                            // Set the max date
                            LIMIT_MAX = createTimeBoundaryObj( limit, upper )

                            // If focused month is more than max date set it to max date
                            if ( TIME_FOCUSED.TIME > LIMIT_MAX.TIME ) {
                                TIME_FOCUSED = LIMIT_MAX
                            }
                        }

                        // Otherwise it's the lower limit
                        else {

                            // So set the min date
                            LIMIT_MIN = createTimeBoundaryObj( limit )

                            // If focused month is less than min date set it to min date
                            if ( TIME_FOCUSED.TIME < LIMIT_MIN.TIME ) {
                                TIME_FOCUSED = LIMIT_MIN
                            }
                        }

                        // Render a new calendar
                        calendarRender()

                        return P
                    } //setDateLimit
                }, //Picker.prototype


                // The element node
                ELEMENT = (function( element ) {

                    // Confirm the focus state, convert the element into
                    // a regular text input to remove user-agent stylings,
                    // and then set it as readonly to prevent keyboard popup
                    element.autofocus = ( element == document.activeElement )
                    element.type = 'text'
                    element.readOnly = true
                    return element
                })( $ELEMENT[ 0 ] ), //ELEMENT


                // The picker object
                PICKER = {
                    id: ~~( Math.random() * 1e9 )
                }, //PICKER


                // The classes
                CLASSES = SETTINGS.klass,


                // The date in various formats
                TIME_FORMATS = (function() {

                    // Get the length of the first word
                    function getFirstWordLength( string ) {
                        return string.match( /\w+/ )[ 0 ].length
                    }

                    // If the second character is a digit, length is 2 otherwise 1.
                    function getDigitsLength( string ) {
                        return ( /\d/ ).test( string[ 1 ] ) ? 2 : 1
                    }

                    // Get the length of the month from a string
                    function getMonthLength( string, dateObj, collection ) {

                        // Grab the first word
                        var word = string.match( /\w+/ )[ 0 ]

                        // If there's no index for the date object's month,
                        // find it in the relevant months collection and add 1
                        // because we subtract 1 when we create the date object
                        if ( !dateObj.mm && !dateObj.m ) {
                            dateObj.m = collection.indexOf( word ) + 1
                        }

                        // Return the length of the word
                        return word.length
                    }


                    // Return the date formats object
                    return {
                        h: function( string ) {

                            // If there's string, then get the digits length.
                            // Otherwise return the selected hour in "standard" format.
                            return string ? getDigitsLength( string ) : this.HOUR ? this.HOUR % 12 : 12
                        },

                        hh: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected hour in "standard" format with a leading zero.
                            return string ? 2 : leadZero( this.HOUR ? this.HOUR % 12 : 12 )
                        },

                        H: function( string ) {

                            // If there's string, then get the digits length.
                            // Otherwise return the selected hour in "military" format as a string.
                            return string ? getDigitsLength( string ) : '' + this.HOUR
                        },

                        HH: function( string ) {

                            // If there's string, then get the digits length.
                            // Otherwise return the selected hour in "military" format with a leading zero.
                            return string ? getDigitsLength( string ) : leadZero( this.HOUR )
                        },

                        i: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected minutes.
                            return string ? 2 : leadZero( this.MINS )
                        },

                        a: function( string ) {

                            // If there's a string, then the length is always 4.
                            // Otherwise check if it's more than "noon" and return either am/pm.
                            return string ? 4 : MINUTES_IN_DAY / 2 > this.TIME ? 'a.m.' : 'p.m.'
                        },

                        A: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise check if it's more than "noon" and return either am/pm.
                            return string ? 2 : MINUTES_IN_DAY / 2 > this.TIME ? 'AM' : 'PM'
                        },

                        d: function( string ) {

                            // If there's string, then get the digits length.
                            // Otherwise return the selected date.
                            return string ? getDigitsLength( string ) : this.DATE
                        },
                        dd: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected date with a leading zero.
                            return string ? 2 : leadZero( this.DATE )
                        },
                        ddd: function( string ) {

                            // If there's a string, then get the length of the first word.
                            // Otherwise return the short selected weekday.
                            return string ? getFirstWordLength( string ) : SETTINGS.weekdaysShort[ this.DAY ]
                        },
                        dddd: function( string ) {

                            // If there's a string, then get the length of the first word.
                            // Otherwise return the full selected weekday.
                            return string ? getFirstWordLength( string ) : SETTINGS.weekdaysFull[ this.DAY ]
                        },
                        m: function( string ) {

                            // If there's a string, then get the length of the digits
                            // Otherwise return the selected month with 0index compensation.
                            return string ? getDigitsLength( string ) : this.MONTH + 1
                        },
                        mm: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected month with 0index and leading zero.
                            return string ? 2 : leadZero( this.MONTH + 1 )
                        },
                        mmm: function( string, dateObject ) {

                            var collection = SETTINGS.monthsShort

                            // If there's a string, get length of the relevant month string
                            // from the short months collection. Otherwise return the
                            // selected month from that collection.
                            return string ? getMonthLength( string, dateObject, collection ) : collection[ this.MONTH ]
                        },
                        mmmm: function( string, dateObject ) {

                            var collection = SETTINGS.monthsFull

                            // If there's a string, get length of the relevant month string
                            // from the full months collection. Otherwise return the
                            // selected month from that collection.
                            return string ? getMonthLength( string, dateObject, collection ) : collection[ this.MONTH ]
                        },
                        yy: function( string ) {

                            // If there's a string, then the length is always 2.
                            // Otherwise return the selected year by slicing out the first 2 digits.
                            return string ? 2 : ( '' + this.YEAR ).slice( 2 )
                        },
                        yyyy: function( string ) {

                            // If there's a string, then the length is always 4.
                            // Otherwise return the selected year.
                            return string ? 4 : this.YEAR
                        },

                        // Create an array by splitting the format passed
                        toArray: function( format ) { return format.split( IS_TIME_PICKER ? /(h{1,2}|H{1,2}|i|a|A|!.)/g : /(d{1,4}|m{1,4}|y{4}|yy|!.)/g ) }

                    } //endreturn
                })(), //TIME_FORMATS


                // Create time object for now
                NOW = createTimeObj(),


                // Create the min limit time object
                LIMIT_MIN = createTimeBoundaryObj( SETTINGS.minLimit ),


                // Create the max limit time object
                // * A truthy second argument creates the upper limit
                LIMIT_MAX = createTimeBoundaryObj( SETTINGS.maxLimit, 1 ),


                // Create a pseudo min and max date for disabled
                // calendars as the respective opposite limit
                PSEUDO_LIMIT_MIN = LIMIT_MAX,
                PSEUDO_LIMIT_MAX = LIMIT_MIN,


                // Create a collection of times to disable
                TIMES_TO_DISABLE = (function( datesCollection ) {

                    // If a collection was passed, we need to create calendar date objects
                    if ( Array.isArray( datesCollection ) ) {

                        // If the "all" flag is true, remove the flag from the collection
                        // and flip the condition of which dates to disable
                        if ( datesCollection[ 0 ] === true ) {
                            PICKER.off = datesCollection.shift()
                        }

                        // Map through the dates passed and return the collection
                        return datesCollection.map( function( date ) {

                            // If the date is a number, we need to disable weekdays
                            if ( !isNaN( date ) ) {

                                // So flip the "off days" boolean
                                PICKER.offDays = 1

                                // If the first day flag is truthy, we maintain the
                                // 0index of the date by getting the remainder from 7.
                                // Otherwise return the date with 0index compensation.
                                return SETTINGS.firstDay ? date % DAYS_IN_WEEK : --date
                            }

                            // Otherwise assume it's an array and fix the month 0index
                            --date[ 1 ]

                            // Then create and return the date,
                            // replacing it in the collection
                            return createTimeObj( date )
                        })
                    }
                })( SETTINGS.datesDisabled ), //TIMES_TO_DISABLE


                // Create a function that will filter through the dates
                // and return true if looped date is to be disabled
                DISABLED_TIMES = (function() {

                    // Check if the looped date should be disabled
                    // based on the time being the same as a disabled date
                    // or the day index being within the collection
                    var isDisabledDate = function( date ) {
                        return this.TIME == date.TIME || TIMES_TO_DISABLE.indexOf( this.DAY ) > -1
                    }


                    // If all calendar dates should be disabled
                    if ( PICKER.off ) {

                        // Map through all the dates to disable
                        TIMES_TO_DISABLE.map( function( loopDate ) {

                            // If the looped date is less than the latest lowest date
                            // and greater than the minimum date, then set it as the lowest date
                            if ( loopDate.TIME < PSEUDO_LIMIT_MIN.TIME && loopDate.TIME > LIMIT_MIN.TIME ) {
                                PSEUDO_LIMIT_MIN = loopDate
                            }

                            // If the looped date is more than the latest highest date
                            // and less than the maximum date, then set it as the highest date
                            if ( loopDate.TIME > PSEUDO_LIMIT_MAX.TIME && loopDate.TIME <= LIMIT_MAX.TIME ) {
                                PSEUDO_LIMIT_MAX = loopDate
                            }
                        })

                        // Finally, return a function that maps each date
                        // in the collection of dates to not disable.
                        return function( date, i, collection ) {

                            // Map the array of disabled dates and check if this is not one
                            return ( collection.map( isDisabledDate, this ).indexOf( true ) < 0 )
                        }
                    }


                    // Otherwise just return the function that checks if a date is disabled
                    return isDisabledDate
                })(), //DISABLED_TIMES


                // Create calendar object for the highlighted day
                TIME_HIGHLIGHTED = (function( dateDataValue, dateEntered ) {

                    // If there a date `data-value`
                    if ( dateDataValue ) {

                        // Set the date entered to an empty object
                        dateEntered = {}

                        // Map through the submit format array
                        TIME_FORMATS.toArray( SETTINGS.formatSubmit ).map( function( formatItem ) {

                            // If the formatting length function exists, invoke it
                            // with the `data-value` and the date we are creating.
                            // Otherwise it's the length of the formatting item being mapped
                            var formattingLength = TIME_FORMATS[ formatItem ] ? TIME_FORMATS[ formatItem ]( dateDataValue, dateEntered ) : formatItem.length

                            // If the formatting length function exists, slice up
                            // the value and pass it into the date we're creating.
                            if ( TIME_FORMATS[ formatItem ] ) {
                                dateEntered[ formatItem ] = dateDataValue.slice( 0, formattingLength )
                            }

                            // Update the remainder of the string by slicing away the format length
                            dateDataValue = dateDataValue.slice( formattingLength )
                        })

                        // Finally, create an array with the date entered while
                        // parsing each item as an integer and compensating for 0index
                        dateEntered = [ +(dateEntered.yyyy || dateEntered.yy), +(dateEntered.mm || dateEntered.m) - 1, +(dateEntered.dd || dateEntered.d) ]
                    }


                    // Otherwise, try to natively parse the date in the input
                    else {
                        dateEntered = Date.parse( dateEntered )
                    }


                    // If there's a valid date in the input or the dateEntered
                    // is now an array, create a validated date with it.
                    // Otherwise set the highlighted date to today after validating.
                    return createValidatedDate( dateEntered && ( !isNaN( dateEntered ) || Array.isArray( dateEntered ) ) ? dateEntered : NOW )
                })( ELEMENT.getAttribute( 'data-value' ), ELEMENT.value ),


                // The date selected is initially the date highlighted
                TIME_SELECTED = TIME_HIGHLIGHTED,


                // Month focused is based on highlighted date
                TIME_FOCUSED = TIME_HIGHLIGHTED,


                // If there's a format for the hidden input element, create the element
                // using the name of the original input plus suffix and update the value
                // with whatever is entered in the input on load. Otherwise set it to null.
                ELEMENT_HIDDEN = SETTINGS.formatSubmit ? $( '<input type=hidden name=' + ELEMENT.name + SETTINGS.hiddenSuffix + '>' ).val( ELEMENT.value ? getTimeFormatted( SETTINGS.formatSubmit ) : '' )[ 0 ] : null,


                // Create the calendar table head with weekday labels
                // by "copying" the weekdays collection based on the settings.
                // * We do a copy so we don't mutate the original array.
                TABLE_HEAD = IS_TIME_PICKER ? 0 : (function( weekdaysCollection ) {

                    // If the first day should be Monday, then grab
                    // Sunday and push it to the end of the collection
                    if ( SETTINGS.firstDay ) {
                        weekdaysCollection.push( weekdaysCollection.splice( 0, 1 )[ 0 ] )
                    }

                    // Go through each day of the week and return a wrapped header row.
                    // Take the result and apply anoth table head wrapper to group it all.
                    return createNode( 'thead',
                        createNode( 'tr',
                            weekdaysCollection.map( function( weekday ) {
                                return createNode( 'th', weekday, CLASSES.weekdays )
                            })
                        )
                    )
                })( ( SETTINGS.showWeekdaysShort ? SETTINGS.weekdaysShort : SETTINGS.weekdaysFull ).slice( 0 ) ), //TABLE_HEAD


                // Create the calendar holder with a new wrapped calendar and bind the events
                $HOLDER = $( createNode( STRING_DIV, createWrappedPicker(), CLASSES.holder ) ).on( 'mousedown', function( event ) {

                    // If the target of the event is not one of the calendar items,
                    // prevent default action to keep focus on the input element
                    if ( PICKER.items.indexOf( event.target ) < 0 ) {
                        event.preventDefault()
                    }
                }).on( 'click', function( event ) {

                    // If the calendar is closed and there appears to be no click, do nothing
                    // * This is done to prevent the "enter" key propagating as a click.
                    //   On all browsers (except old IEs) the client click x & y are 0.
                    if ( !PICKER.isOpen && !event.clientX && !event.clientY ) {
                        return
                    }

                    var
                        timeToSelect,

                        // Get the jQuery target
                        $target = $( event.target ),

                        // Get the target data
                        targetData = $target.data()


                    // Stop the event from bubbling to the document
                    eventPreventPropagation( event )


                    // Put focus back onto the element
                    ELEMENT.focus()

                    // For IE, set the calendar to force close
                    // * This needs to be after `ELEMENT.focus()`
                    PICKER._IE = 1


                    // If a navigator button was clicked,
                    // show the month in the relative direction
                    if ( targetData.nav ) {
                        showMonth( TIME_FOCUSED.MONTH + targetData.nav )
                    }

                    // If a clear button was clicked,
                    // clear the elements value and then close it
                    else if ( targetData.clear ) {
                        P.clear().close()
                    }

                    // If a date or time was clicked, split it into an array
                    // of time units, set the time, and then close the picker.
                    else if ( targetData.pick ) {
                        P.set( targetData.pick.split( IS_TIME_PICKER ? ':' : '/' ) ).close()
                    }

                    // If the target is the holder, close the picker
                    else if ( $target[ 0 ] == $HOLDER[ 0 ] ) {
                        P.close()
                    }
                }), // $HOLDER


                // Translate a keycode to a relative change in date
                KEYCODE_TO_DATE = {

                    // Down
                    40: 7,

                    // Up
                    38: -7,

                    // Right
                    39: 1,

                    // Left
                    37: -1
                } //KEYCODE_TO_DATE




            // Create a time object
            function createTimeObj( timePassed, unlimited ) {

                // If it's a time picker
                if ( IS_TIME_PICKER ) {

                    // If we have an array to deal with, float the values and convert into total minutes.
                    timePassed = Array.isArray( timePassed ) ? +timePassed[ 0 ] * MINUTES_IN_HOUR + (+timePassed[ 1 ]) : timePassed

                    return {

                        // Divide to get hours from minutes.
                        HOUR: ~~( timePassed / MINUTES_IN_HOUR ),

                        // The remainder is the minutes.
                        MINS: timePassed % MINUTES_IN_HOUR,

                        // Reference to total minutes.
                        TIME: timePassed
                    }
                }


                // If the date passed is an array, create the date by splitting the items
                if ( Array.isArray( timePassed ) ) {
                    timePassed = new Date( timePassed[ 0 ], timePassed[ 1 ], timePassed[ 2 ] )
                }

                // If the date passed is a number, create the date with the number
                else if ( !isNaN( timePassed ) ) {
                    timePassed = new Date( timePassed )
                }

                // Otherwise if it's not unlimited, set the date to today and
                // set the time to midnight (for comparison purposes)
                else if ( !unlimited ) {
                    timePassed = new Date()
                    timePassed.setHours( 0, 0, 0, 0 )
                }

                // Return the calendar date object
                return {
                    YEAR: unlimited || timePassed.getFullYear(),
                    MONTH: unlimited || timePassed.getMonth(),
                    DATE: unlimited || timePassed.getDate(),
                    DAY: unlimited || timePassed.getDay(),
                    TIME: unlimited || timePassed.getTime(),
                    OBJ: unlimited || timePassed
                }
            } //createTimeObj


            /**
             * Create a bounding date allowed on the calendar
             * * A truthy second argument creates the upper boundary
             */
            function createTimeBoundaryObj( limit, upper ) {

                // If it's a time picker, just create a time object
                if ( IS_TIME_PICKER ) {
                    return createTimeObj( limit )
                }

                // If the limit is set to true, just return today
                if ( limit === true ) {
                    return NOW
                }

                // If the limit is an array, construct the date by fixing month 0index
                if ( Array.isArray( limit ) ) {
                    --limit[ 1 ]
                    return createTimeObj( limit )
                }

                // If there is a limit and its a number, create a
                // calendar date relative to today by adding the limit
                if ( limit && !isNaN( limit ) ) {
                    return createTimeObj([ NOW.YEAR, NOW.MONTH, NOW.DATE + limit ])
                }

                // Otherwise create an infinite date
                return createTimeObj( 0, upper ? Infinity : -Infinity )
            } //createTimeBoundaryObj


            /**
             * Create a validated date
             */
            function createValidatedDate( datePassed, direction, skipMonthCheck ) {

                // If the date passed isn't a date, create one
                datePassed = !datePassed.TIME ? createTimeObj( datePassed ) : datePassed


                // If the calendar "disabled" flag is truthy and there are only disabled weekdays
                if ( PICKER.off && !PICKER.offDays ) {

                    // If the date is less than the pseudo min date or greater than pseudo max date,
                    // set it as the pseudo date limit. Otherwise keep it the same.
                    datePassed = datePassed.TIME < PSEUDO_LIMIT_MIN.TIME ? PSEUDO_LIMIT_MIN : datePassed.TIME > PSEUDO_LIMIT_MAX.TIME ? PSEUDO_LIMIT_MAX : datePassed
                }

                // Otherwise if there are disabled dates
                else if ( TIMES_TO_DISABLE ) {

                    // Create a reference to the original date passed
                    var originalDate = datePassed

                    // Check if this date is disabled. If it is,
                    // then keep adding the direction (or 1) to the date
                    // until we get to a date that's enabled.
                    while ( TIMES_TO_DISABLE.filter( DISABLED_TIMES, datePassed ).length ) {

                        // Otherwise create the next date based on the direction
                        datePassed = createTimeObj([ datePassed.YEAR, datePassed.MONTH, datePassed.DATE + ( direction || 1 ) ])

                        // Check if the month check should be skipped to avoid extra loops.
                        // Otherwise if we've gone through to another month, create a new
                        // date based on the direction being less than zero (rather than more).
                        // Then set this new date as the original and looped date.
                        if ( !skipMonthCheck && datePassed.MONTH != originalDate.MONTH ) {
                            originalDate = datePassed = createTimeObj([ originalDate.YEAR, originalDate.MONTH, direction < 0 ? --originalDate.DATE : ++originalDate.DATE ])
                        }
                    }
                }


                // If it's less that min date, set it to min date
                // by creating a validated date by adding one
                // until we find an enabled date
                // * A truthy third argument skips the month check
                if ( datePassed.TIME < LIMIT_MIN.TIME ) {
                    datePassed = createValidatedDate( LIMIT_MIN, 1, 1 )
                }


                // If it's more than max date, set it to max date
                // by creating a validated date by subtracting one
                // until we find an enabled date
                // * A truthy third argument skips the month check
                else if ( datePassed.TIME > LIMIT_MAX.TIME ) {
                    datePassed = createValidatedDate( LIMIT_MAX, -1, 1 )
                }


                // Finally, return the date
                return datePassed
            } //createValidatedDate


            /**
             * Create the nav for next/prev month
             */
            function createMonthNav( next ) {

                // If the focused month is outside the range, return an empty string
                if ( ( next && TIME_FOCUSED.YEAR >= LIMIT_MAX.YEAR && TIME_FOCUSED.MONTH >= LIMIT_MAX.MONTH ) || ( !next && TIME_FOCUSED.YEAR <= LIMIT_MIN.YEAR && TIME_FOCUSED.MONTH <= LIMIT_MIN.MONTH ) ) {
                    return ''
                }

                // Otherwise, return the created month tag
                var monthTag = 'month' + ( next ? 'Next' : 'Prev' )
                return createNode( STRING_DIV, SETTINGS[ monthTag ], CLASSES[ monthTag ], 'data-nav=' + ( next || -1 ) )
            } //createMonthNav


            /**
             * Create the month label
             */
            function createMonthLabel( monthsCollection ) {

                // If there's a need for a month selector
                return SETTINGS.monthSelector ?

                    // Create the dom string node for a select element
                    createNode( 'select',

                        // Map through the months collection
                        monthsCollection.map( function( month, monthIndex ) {

                            // Create a dom string node for each option
                            return createNode( 'option',

                                // With the month and no classes
                                month, 0,

                                // Set the value and selected index
                                'value=' + monthIndex + ( TIME_FOCUSED.MONTH == monthIndex ? ' selected' : '' ) +

                                // Plus the disabled attribute if it's outside the range
                                getMonthInRange( monthIndex, TIME_FOCUSED.YEAR, ' disabled', '' )
                            )
                        }),

                        // The month selector class
                        CLASSES.selectMonth,

                        // And some tabindex
                        getTabindexState()

                    // Otherwise just return the month focused
                    ) : createNode( STRING_DIV, monthsCollection[ TIME_FOCUSED.MONTH ], CLASSES.month )
            } //createMonthLabel


            /**
             * Create the year label
             */
            function createYearLabel() {

                var
                    yearFocused = TIME_FOCUSED.YEAR,
                    yearsInSelector = SETTINGS.yearSelector


                // If there is a need for a years selector
                // then create a dropdown within the valid range
                if ( yearsInSelector ) {

                    // If year selector setting is true, default to 5.
                    // Otherwise divide the years in selector in half
                    // to get half before and half after
                    yearsInSelector = yearsInSelector === true ? 5 : ~~( yearsInSelector / 2 )

                    var
                        // Create a collection to hold the years
                        yearsCollection = [],

                        // The lowest year possible is the difference between
                        // the focused year and the number of years in the selector
                        lowestYear = yearFocused - yearsInSelector,

                        // The first year is the lower of the two numbers:
                        // the lowest year or the minimum year.
                        firstYear = getNumberInRange( lowestYear, LIMIT_MIN.YEAR ),

                        // The highest year is the sum of the focused year
                        // and the years in selector plus the left over years.
                        highestYear = yearFocused + yearsInSelector + ( firstYear - lowestYear ),

                        // The last year is the higher of the two numbers:
                        // the highest year or the maximum year.
                        lastYear = getNumberInRange( highestYear, LIMIT_MAX.YEAR, 1 )


                    // In case there are leftover years to put in the selector,
                    // we need to get the lower of the two numbers:
                    // the lowest year minus leftovers, or the minimum year
                    firstYear = getNumberInRange( lowestYear - ( highestYear - lastYear ), LIMIT_MIN.YEAR )


                    // Add the years to the collection by looping through the range
                    for ( var index = 0; index <= lastYear - firstYear; index += 1 ) {
                        yearsCollection.push( firstYear + index )
                    }


                    // Create the dom string node for a select element
                    return createNode( 'select',

                        // Map through the years collection
                        yearsCollection.map( function( year ) {

                            // Create a dom string node for each option
                            return createNode( 'option',

                                // With the year and no classes
                                year, 0,

                                // Set the value and selected index
                                'value=' + year + ( yearFocused == year ? ' selected' : '' )
                            )
                        }),

                        // The year selector class
                        CLASSES.selectYear,

                        // And some tabindex
                        getTabindexState()
                    )
                }


                // Otherwise just return the year focused
                return createNode( STRING_DIV, yearFocused, CLASSES.year )
            } //createYearLabel


            /**
             * Create the calendar table body
             */
            function createTableBody() {

                var
                    // The loop date object
                    loopDate,

                    // A pseudo index will be the divider between
                    // the previous month and the focused month
                    pseudoIndex,

                    // An array that will hold the classes
                    // and binding for each looped date
                    classAndBinding,

                    // Collection of the dates visible on the calendar
                    // * This gets discarded at the end
                    calendarDates = [],

                    // Weeks visible on the calendar
                    calendarWeeks = '',

                    // Count the number of days in the focused month
                    // by getting the 0-th date of the next month
                    countMonthDays = createTimeObj([ TIME_FOCUSED.YEAR, TIME_FOCUSED.MONTH + 1, 0 ]).DATE,

                    // Count the days to shift the start of the month
                    // by getting the day the first of the month falls on
                    // and subtracting 1 to compensate for day 1index
                    // or 2 if "Monday" should be the first day.
                    countShiftby = createTimeObj([ TIME_FOCUSED.YEAR, TIME_FOCUSED.MONTH, 1 ]).DAY + ( SETTINGS.firstDay ? -2 : -1 )


                // If the count to shift by is less than the first day
                // of the month, then add a week.
                countShiftby += countShiftby < -1 ? 7 : 0


                // Go through all the days in the calendar
                // and map a calendar date
                for ( var index = 0; index < DAYS_IN_CALENDAR; index += 1 ) {

                    // Get the distance between the index and the count
                    // to shift by. This will serve as the separator
                    // between the previous, current, and next months.
                    pseudoIndex = index - countShiftby


                    // Create a calendar date with a negative or positive pseudoIndex
                    loopDate = createTimeObj([ TIME_FOCUSED.YEAR, TIME_FOCUSED.MONTH, pseudoIndex ])


                    // Set the date class and bindings on the looped date.
                    // If the pseudoIndex is greater than zero,
                    // and less or equal to the days in the month,
                    // we need dates from the focused month.
                    classAndBinding = createNodeClassAndBinding( loopDate, [ CLASSES.day, pseudoIndex > 0 && pseudoIndex <= countMonthDays ? CLASSES.dayInfocus : CLASSES.dayOutfocus ] )


                    // Create the looped date wrapper,
                    // and then create the table cell wrapper
                    // and finally pass it to the calendar array
                    calendarDates.push( createNode( 'td', createNode( STRING_DIV, loopDate.DATE, classAndBinding[ 0 ], classAndBinding[ 1 ] ) ) )


                    // Check if it's the end of a week.
                    // * We add 1 for 0index compensation
                    if ( ( index % DAYS_IN_WEEK ) + 1 == DAYS_IN_WEEK ) {

                        // Wrap the week and append it into the calendar weeks
                        calendarWeeks += createNode( 'tr', calendarDates.splice( 0, DAYS_IN_WEEK ) )
                    }

                } //endfor



                // Join the dates and wrap the calendar body
                return createNode( 'tbody', calendarWeeks, CLASSES.body )
            } //createTableBody


            /**
             * Create the class and data binding for a looped date node.
             * Returns an array with 2 items:
             * 1) The classes string
             * 2) The data binding string
             */
            function createNodeClassAndBinding( timeObj, defaultKlasses ) {

                var
                    // State check for time being enabled/disabled
                    isTimeDisabled,

                    // The data binding
                    dataBinding,

                    // Create a collection for the classes
                    // with the default classes already included
                    klassCollection = defaultKlasses || []


                // If the time object is for time, then we need those conditionals
                if ( IS_TIME_PICKER ) {

                    //this will never happen because they will always be in range
                    if ( timeObj.TIME < LIMIT_MIN.TIME || timeObj.TIME > LIMIT_MAX.TIME ) {

                    }

                    // The time data binding
                    dataBinding = [
                        timeObj.HOUR,
                        timeObj.MINS
                    ].join( ':' )
                }

                else {

                    // If it's less than the minimum date or greater than the maximum date,
                    // or if there are dates to disable and this looped date is one of them,
                    // flip the "disabled" state to truthy and add the "disabled" class
                    if ( timeObj.TIME < LIMIT_MIN.TIME || timeObj.TIME > LIMIT_MAX.TIME || ( TIMES_TO_DISABLE && TIMES_TO_DISABLE.filter( DISABLED_TIMES, timeObj ).length ) ) {
                        isTimeDisabled = 1
                        klassCollection.push( CLASSES.dayDisabled )
                    }


                    // If it's today, add the class
                    if ( timeObj.TIME == NOW.TIME ) {
                        klassCollection.push( CLASSES.dayToday )
                    }


                    // If it's the highlighted date, add the class
                    if ( timeObj.TIME == TIME_HIGHLIGHTED.TIME ) {
                        klassCollection.push( CLASSES.dayHighlighted )
                    }


                    // If it's the selected date, add the class
                    if ( timeObj.TIME == TIME_SELECTED.TIME ) {
                        klassCollection.push( CLASSES.daySelected )
                    }


                    // The date data binding
                    dataBinding = [
                        timeObj.YEAR,
                        timeObj.MONTH + 1, // add 1 to display an accurate date
                        timeObj.DATE
                    ].join( '/' )
                }


                // Return an array with the classes and data binding
                return [

                    // The classes joined by a single whitespace
                    klassCollection.join( ' ' ),

                    // And the data binding based on its "disabled" state
                    'data-' + ( isTimeDisabled ? 'disabled' : 'pick' ) + '=' + dataBinding
                ]
            } //createTimeObjClassAndBinding


            /**
             * Create the "today" and "clear" buttons
             */
            function createTodayAndClear() {
                return createNode( 'button', SETTINGS.today, CLASSES.buttonToday, 'data-date=' + getTimeFormatted( 'yyyy/mm/dd', NOW ) + ' ' + getTabindexState() ) + createNode( 'button', SETTINGS.clear, CLASSES.buttonClear, 'data-clear=1 ' + getTabindexState() )
            } //createTodayAndClear


            /**
             * Create the calendar specific items
             */
            function createCalendar() {

                // The calendar header
                return createNode( STRING_DIV,

                    // The prev/next month tags
                    // * Truthy argument creates "next" tag
                    createMonthNav() + createMonthNav( 1 ) +

                    // Create the month label
                    createMonthLabel( SETTINGS.showMonthsFull ? SETTINGS.monthsFull : SETTINGS.monthsShort ) +

                    // Create the year label
                    createYearLabel(),

                    // The header class
                    CLASSES.header
                 ) +

                // The calendar table with table head
                // and a new calendar table body
                createNode( 'table', [ TABLE_HEAD, createTableBody() ], CLASSES.table ) +

                // Create the "today" and "clear" buttons
                createNode( STRING_DIV, createTodayAndClear(), CLASSES.footer )
            } //createCalendar


            /**
             * Create the list of times with a certain interval
             */
            function createClockList( interval ) {

                var timeObj, loopTime, classAndBinding,
                    list = ''

                for ( loopTime = LIMIT_MIN.TIME; loopTime < LIMIT_MAX.TIME; loopTime += interval ) {
                    timeObj = createTimeObj( loopTime )
                    classAndBinding = createNodeClassAndBinding( timeObj, [ CLASSES.listItem ] )
                    list += createNode( 'li',
                        getTimeFormatted( 0, timeObj ),
                        classAndBinding[ 0 ],
                        classAndBinding[ 1 ]
                    )
                }

                return list
            } //createClockList


            /**
             * Create the clock specific items
             */
            function createClock() {
                return createNode( 'ul',
                    createClockList( SETTINGS.timeStep ),
                    CLASSES.list
                ) //endreturn
            } //createClock


            /**
             * Create the wrapped calendar using the collection
             * of all calendar items and a new table body
             */
            function createWrappedPicker() {

                // Create a calendar wrapper node
                return createNode( STRING_DIV,

                    // Create a calendar frame
                    createNode( STRING_DIV,

                        // Create a calendar box node
                        createNode( STRING_DIV,

                            IS_TIME_PICKER ? createClock() : createCalendar(),

                            // The picker item class
                            CLASSES.item
                        ),

                        // Calendar wrap class
                        CLASSES.wrap
                    ),

                    // Calendar frame class
                    CLASSES.frame
                ) //endreturn
            } //calendarWrapped


            /**
             * Get the number that's allowed within an upper or lower limit.
             * * A truthy third argument tests against the upper limit.
             */
            function getNumberInRange( number, limit, upper ) {

                // If we need to test against the upper limit
                // and number is less than the limit,
                // or we need to test against the lower limit
                // and number is more than the limit,
                // return the number. Otherwise return the limit.
                return ( upper && number < limit ) || ( !upper && number > limit ) ? number : limit
            } //getNumberInRange


            /**
             * Return a month by comparing with the date range.
             * If outside the range, returns the "alternate" or "range" value.
             * Otherwise returns the "in range" value or the month itself.
             */
            function getMonthInRange( month, year, alternateValue, inRangeValue ) {

                // If the month is less than the min month,
                // then return the alternate value or min month.
                if ( year <= LIMIT_MIN.YEAR && month < LIMIT_MIN.MONTH ) {
                    return alternateValue || LIMIT_MIN.MONTH
                }

                // If the month is more than the max month,
                // then return the alternate value or max month.
                if ( year >= LIMIT_MAX.YEAR && month > LIMIT_MAX.MONTH ) {
                    return alternateValue || LIMIT_MAX.MONTH
                }

                // Otherwise return the "in range" value or the month itself.
                // * We test `inRangeValue` against null because we need to
                //   test against null and undefined. 0 should be allowed.
                return inRangeValue != null ? inRangeValue : month
            } //getMonthInRange


            /**
             * Get the tabindex based on the calendar open/closed state
             */
            function getTabindexState() {
                return 'tabindex=' + ( PICKER.isOpen ? 0 : -1 )
            }


            /**
             * Get any date in any format. Defaults to getting
             * the superficially selected date.
             */
            function getTimeFormatted( format, timeObj ) {

                // Go through all the date formats and convert the format passed
                // into an array to map which we join into a string at the end.
                return TIME_FORMATS.toArray( format || SETTINGS.format ).map( function( value ) {

                    // Trigger the date formats function
                    // or just return value itself.
                    return triggerFunction( TIME_FORMATS[ value ], timeObj || TIME_SELECTED ) || value.replace( /^!/, '' )
                }).join( '' )
            } //getTimeFormatted


            /**
             * Set a date as selected or superficially selected
             */
            function setTimeSelected( timeObj, isSuperficial ) {

                // Set the target as the highlight
                TIME_HIGHLIGHTED = timeObj

                // Set the target as the focus
                TIME_FOCUSED = timeObj

                // If it's not just a superficial selection,
                // update the input elements values
                if ( !isSuperficial ) {
                    setElementsValue( timeObj )
                }

                // Then render a new calendar
                calendarRender()
            } //setTimeSelected


            /**
             * Set the date in the input element and trigger a change event
             */
            function setElementsValue( timeObj ) {

                // If there's a date targeted, update the selected date
                TIME_SELECTED = timeObj || TIME_SELECTED

                // Set the element value as the formatted date
                // if there was a date targeted. Otherwise clear it.
                // And then broadcast a change event.
                $ELEMENT.val( timeObj ? getTimeFormatted() : '' ).trigger( 'change' )

                // Trigger the onSelect method within scope of the picker
                triggerFunction( SETTINGS.onSelect, P )
            } //setElementsValue


            /**
             * Find something within the calendar holder
             */
            function $findInHolder( klass ) {
                return $HOLDER.find( '.' + klass )
            } //$findInHolder


            /**
             * Show the month visible on the calendar
             */
            function showMonth( month, year ) {

                // Ensure we have a year to work with
                year = year || TIME_FOCUSED.YEAR

                // Get the month to be within
                // the minimum and maximum date limits
                month = getMonthInRange( month, year )

                // Set the month to show in focus
                // * We set the date to 1st of the month
                //   because date doesn't matter here
                TIME_FOCUSED = createTimeObj([ year, month, 1 ])

                // Then render a new calendar
                calendarRender()
            } //showMonth


            /**
             * Toggle the calendar elements as "tab-able" by mapping
             * through the calendar items and updating the tabindex.
             */
            function toggleCalendarElements( tabindex ) {
                PICKER.items.map( function( item ) {
                    if ( item ) item.tabIndex = tabindex
                })
            } //toggleCalendarElements


            /**
             * Get an updated collection of calendar items.
             */
            function getUpdatedCalendarItems() {

                return [

                    // The month selector
                    $findInHolder( CLASSES.selectMonth ).on({

                        // *** For iOS ***
                        click: eventPreventPropagation,

                        // Bind the change event
                        change: function() {

                            // Show the month by floating the option selected
                            showMonth( +this.value )

                            // Find the new month selector and focus back on it
                            $findInHolder( CLASSES.selectMonth ).focus()
                        }
                    })[ 0 ],

                    // The year selector
                    $findInHolder( CLASSES.selectYear ).on({

                        // *** For iOS ***
                        click: eventPreventPropagation,

                        // Bind the change event
                        change: function() {

                            // Show the year by floating the option selected and month in focus
                            showMonth( TIME_FOCUSED.MONTH, +this.value )

                            // Find the new year selector and focus back on it
                            $findInHolder( CLASSES.selectYear ).focus()
                        }
                    })[ 0 ],

                    // The "today" button
                    $findInHolder( CLASSES.buttonToday )[ 0 ],

                    // The "clear" button
                    $findInHolder( CLASSES.buttonClear )[ 0 ]
                ]
            } //getUpdatedCalendarItems


            /**
             * Render a new calendar
             */
            function calendarRender() {

                // Create a new wrapped calendar and place it within the holder
                $HOLDER.html( createWrappedPicker() )

                // Update the calendar items
                PICKER.items = getUpdatedCalendarItems()
            } //calendarRender


            /**
             * Prevent an event from propagating further
             */
            function eventPreventPropagation( event ) {
                event.stopPropagation()
            } //eventPreventPropagation


            // Return a new initialized picker
            return new P.init()
        } //Picker





    /**
     * Helper functions
     */

    // Check if a value is a function and trigger it, if that
    function triggerFunction( callback, scope ) {
        if ( typeof callback == 'function' ) {
            return callback.call( scope )
        }
    }

    // Return numbers below 10 with a leading zero
    function leadZero( number ) {
        return ( number < 10 ? '0': '' ) + number
    }

    // Create a dom node string
    function createNode( wrapper, item, klass, attribute ) {

        // If the item is false-y, just return an empty string
        if ( !item ) return ''

        // If the item is an array, do a join
        item = Array.isArray( item ) ? item.join( '' ) : item

        // Check for the class
        klass = klass ? ' class="' + klass + '"' : ''

        // Check for any attributes
        attribute = attribute ? ' ' + attribute : ''

        // Return the wrapped item
        return '<' + wrapper + klass + attribute + '>' + item + '</' + wrapper + '>'
    } //createNode




    /**
     * Map through the each picker type and extend jQuery
     */
    [ 'pickadate', 'pickatime' ].map( function( picker, index ) {

        // Create the jQuery extension
        $.fn[ picker ] = function( options ) {

            // Merge the options with a deep copy
            options = $.extend( true, {}, $.fn[ picker ].defaults, options )

            // Just stop if the picker should be disabled
            if ( options.disablePicker ) return this

            return this.each( function() {
                var $this = $( this )
                if ( this.nodeName == 'INPUT' && !$this.data( picker ) ) {
                    $this.data( picker, new Picker( $this, options, index ) )
                }
            })
        }
    })



    /**
     * Default options for the date picker
     */
    $.fn.pickadate.defaults = {

        monthsFull: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
        monthsShort: [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],

        weekdaysFull: [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
        weekdaysShort: [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],

        // Display strings
        monthPrev: '&#9664;',
        monthNext: '&#9654;',
        showMonthsFull: 1,
        showWeekdaysShort: 1,

        // Today and clear
        today: 'Today',
        clear: 'Clear',

        // Date format to show on the input element
        format: 'd mmmm, yyyy',

        // Date format to send to the server
        formatSubmit: 0,

        // Hidden element name suffix
        hiddenSuffix: '_submit',

        // First day of the week: 0 = Sunday, 1 = Monday
        firstDay: 0,

        // Month & year dropdown selectors
        monthSelector: 0,
        yearSelector: 0,

        // Date ranges
        minLimit: 0,
        maxLimit: 0,

        // Dates to disable
        datesDisabled: 0,

        // Disable for browsers with native date support
        disablePicker: 0,

        // Events
        onOpen: 0,
        onClose: 0,
        onSelect: 0,
        onStart: 0,


        // Classes
        klass: {

            inputActive: STRING_PREFIX_DATEPICKER + 'input--active',

            holder: STRING_PREFIX_DATEPICKER + 'holder',
            opened: STRING_PREFIX_DATEPICKER + 'holder--opened',
            focused: STRING_PREFIX_DATEPICKER + 'holder--focused',

            frame: STRING_PREFIX_DATEPICKER + 'frame',
            wrap: STRING_PREFIX_DATEPICKER + 'wrap',

            item: STRING_PREFIX_DATEPICKER + 'calendar',

            table: STRING_PREFIX_DATEPICKER + 'table',

            header: STRING_PREFIX_DATEPICKER + 'header',

            monthPrev: STRING_PREFIX_DATEPICKER + 'nav--prev',
            monthNext: STRING_PREFIX_DATEPICKER + 'nav--next',

            month: STRING_PREFIX_DATEPICKER + 'month',
            year: STRING_PREFIX_DATEPICKER + 'year',

            selectMonth: STRING_PREFIX_DATEPICKER + 'select--month',
            selectYear: STRING_PREFIX_DATEPICKER + 'select--year',

            weekdays: STRING_PREFIX_DATEPICKER + 'weekday',

            body: STRING_PREFIX_DATEPICKER + 'body',

            day: STRING_PREFIX_DATEPICKER + 'day',
            dayDisabled: STRING_PREFIX_DATEPICKER + 'day--disabled',
            daySelected: STRING_PREFIX_DATEPICKER + 'day--selected',
            dayHighlighted: STRING_PREFIX_DATEPICKER + 'day--highlighted',
            dayToday: STRING_PREFIX_DATEPICKER + 'day--today',
            dayInfocus: STRING_PREFIX_DATEPICKER + 'day--infocus',
            dayOutfocus: STRING_PREFIX_DATEPICKER + 'day--outfocus',

            footer: STRING_PREFIX_DATEPICKER + 'footer',

            buttonClear: STRING_PREFIX_DATEPICKER + 'button--clear',
            buttonToday: STRING_PREFIX_DATEPICKER + 'button--today'
        }
    } //$.fn.pickadate.defaults



    /**
     * Default options for the time picker
     */
    $.fn.pickatime.defaults = {

        // Date format to show on the input element
        format: 'h:i A',

        // Date format to send to the server
        formatSubmit: 0,

        // Hidden element name suffix
        hiddenSuffix: '_submit',

        minLimit: 0,
        maxLimit: MINUTES_IN_DAY,
        timeStep: 30,

        // Events
        onOpen: 0,
        onClose: 0,
        onSelect: 0,
        onStart: 0,


        // Classes
        klass: {

            inputActive: STRING_PREFIX_DATEPICKER + 'input--active',

            holder: STRING_PREFIX_DATEPICKER + 'holder',
            opened: STRING_PREFIX_DATEPICKER + 'holder--opened',
            focused: STRING_PREFIX_DATEPICKER + 'holder--focused',

            frame: STRING_PREFIX_DATEPICKER + 'frame',
            wrap: STRING_PREFIX_DATEPICKER + 'wrap',

            item: STRING_PREFIX_DATEPICKER + 'clock',

            list: STRING_PREFIX_DATEPICKER + 'list',
            listItem: STRING_PREFIX_DATEPICKER + 'list-item'
        }
    } //$.fn.pickatime.defaults





    /**
     * Legacy browser support
     */

    /**
     * Cross-Browser Split 1.1.1
     * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
     * Available under the MIT License
     * http://blog.stevenlevithan.com/archives/cross-browser-split
     */
    var nativeSplit = String.prototype.split, compliantExecNpcg = /()??/.exec('')[1] === undefined
    String.prototype.split = function(separator, limit) {
        var str = this
        if (Object.prototype.toString.call(separator) !== '[object RegExp]') {
            return nativeSplit.call(str, separator, limit)
        }
        var output = [],
            flags = (separator.ignoreCase ? 'i' : '') +
                    (separator.multiline  ? 'm' : '') +
                    (separator.extended   ? 'x' : '') +
                    (separator.sticky     ? 'y' : ''),
            lastLastIndex = 0,
            separator2, match, lastIndex, lastLength
        separator = new RegExp(separator.source, flags + 'g')
        str += ''
        if (!compliantExecNpcg) {
            separator2 = new RegExp('^' + separator.source + '$(?!\\s)', flags)
        }
        limit = limit === undefined ? -1 >>> 0 : limit >>> 0
        while (match = separator.exec(str)) {
            lastIndex = match.index + match[0].length
            if (lastIndex > lastLastIndex) {
                output.push(str.slice(lastLastIndex, match.index))
                if (!compliantExecNpcg && match.length > 1) {
                    match[0].replace(separator2, function () {
                        for (var i = 1; i < arguments.length - 2; i++) {
                            if (arguments[i] === undefined) {
                                match[i] = undefined
                            }
                        }
                    })
                }
                if (match.length > 1 && match.index < str.length) {
                    Array.prototype.push.apply(output, match.slice(1))
                }
                lastLength = match[0].length
                lastLastIndex = lastIndex
                if (output.length >= limit) {
                    break
                }
            }
            if (separator.lastIndex === match.index) {
                separator.lastIndex++
            }
        }
        if (lastLastIndex === str.length) {
            if (lastLength || !separator.test('')) {
                output.push('')
            }
        } else {
            output.push(str.slice(lastLastIndex))
        }
        return output.length > limit ? output.slice(0, limit) : output
    }


    // isArray support
    if ( !Array.isArray ) {
        Array.isArray = function( value ) {
            return {}.toString.call( value ) == '[object Array]'
        }
    }


    // Map array support
    if ( ![].map ) {
        Array.prototype.map = function ( callback, self ) {
            var array = this, len = array.length, newArray = new Array( len )
            for ( var i = 0; i < len; i++ ) {
                if ( i in array ) {
                    newArray[ i ] = callback.call( self, array[ i ], i, array )
                }
            }
            return newArray
        }
    }


    // Filter array support
    if ( ![].filter ) {
        Array.prototype.filter = function( callback ) {
            if ( this == null ) throw new TypeError()
            var t = Object( this ), len = t.length >>> 0
            if ( typeof callback != 'function' ) throw new TypeError()
            var newArray = [], thisp = arguments[ 1 ]
            for ( var i = 0; i < len; i++ ) {
              if ( i in t ) {
                var val = t[ i ]
                if ( callback.call( thisp, val, i, t ) ) newArray.push( val )
              }
            }
            return newArray
        }
    }


    // Index of array support
    if ( ![].indexOf ) {
        Array.prototype.indexOf = function( searchElement ) {
            if ( this == null ) throw new TypeError()
            var t = Object( this ), len = t.length >>> 0
            if ( len === 0 ) return -1
            var n = 0
            if ( arguments.length > 1 ) {
                n = Number( arguments[ 1 ] )
                if ( n != n ) {
                    n = 0
                }
                else if ( n != 0 && n != Infinity && n != -Infinity ) {
                    n = ( n > 0 || -1 ) * Math.floor( Math.abs( n ) )
                }
            }
            if ( n >= len ) return -1
            var k = n >= 0 ? n : Math.max( len - Math.abs( n ), 0 )
            for ( ; k < len; k++ ) {
                if ( k in t && t[ k ] === searchElement ) return k
            }
            return -1
        }
    }



})( jQuery, document );





