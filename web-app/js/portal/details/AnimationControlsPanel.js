/*
 * Copyright 2012 IMOS
 *
 * The AODN/IMOS Portal is distributed under the terms of the GNU General Public License
 *
 */

Ext.namespace('Portal.details');

Portal.details.AnimationControlsPanel = Ext.extend(Ext.Panel, {

	state : {
		LOADING : "LOADING",
		PLAYING : "PLAYING",
		REMOVED : "REMOVED",
        PAUSED : "PAUSED"
	},

	constructor : function(cfg) {
		var config = Ext.apply({
					layout : 'form',
					stateful : false,
					bodyStyle : 'padding:6px; margin:2px',
					defaults : {
						cls : 'fullTransparency'
					},
					width : '100%'
				}, cfg);

		Portal.details.AnimationControlsPanel.superclass.constructor.call(this, config);

        
        Ext.MsgBus.subscribe('removeLayer', function(mesg,openLayer) {

        }, this);
        
        Ext.MsgBus.subscribe('selectedLayerChanged', this._onSelectedLayerChanged, this);

        if (this.timeControl) {
            this.timeControl.events.on({
                'speedchanged': this._onSpeedChanged,
                scope: this
            });
        }
	},

	initComponent : function() {
		this.DATE_FORMAT = 'Y-m-d';
		this.TIME_FORMAT = 'H:i:s (P)';
		this.DATE_TIME_FORMAT = this.DATE_FORMAT + ' ' + this.TIME_FORMAT;
		this.STEP_LABEL_DATE_TIME_FORMAT = this.DATE_FORMAT + " H:i:s";

		this.BASE_SPEED = 500;
		this.MAX_SPEED_MULTIPLIER = 32;

		this.animatedLayers = new Array();
		var parent = this;

		this.warn = new Ext.form.Label({
					padding : 5,
					width : 280,
					text : OpenLayers.i18n('warn_label')
				});

		this.speedUp = new Ext.Button({
					icon : 'images/animation/last.png',
					plain : true,
					padding : 5,
					listeners : {
						scope : this,
						'click' : function(button, event) {
                            this._startPlaying();

                            this.timeControl.speedUp();
                            // this._updateSpeedLabel();
                            // this._updateSpeedUpSlowDownButtons();
						}
					},
					tooltip : OpenLayers.i18n('speedUp')
				});

		this.slowDown = new Ext.Button({
					icon : 'images/animation/first.png',
					padding : 5,
					listeners : {
						scope : this,
						'click' : function(button, event) {
                            this._startPlaying();
                            this.timeControl.slowDown();
                            // this._updateSpeedLabel();
                            // this._updateSpeedUpSlowDownButtons();
						}
					},
					tooltip : OpenLayers.i18n('slowDown')
				});

		this.label = new Ext.form.Label({
					html : "<h4>Select Time Period</h4>"
				});

		this.stepSlider = new Ext.slider.SingleSlider({
					ref : 'stepSlider',
					width : 115,
					flex : 3,
					listeners : {
						scope : this,
						drag : function(slider, ev) {
                            this.timeControl.setStep(slider.getValue());
						}
					}
				});

		this.playButton = new Ext.Button({
					padding : 5,
					plain : true,
					disabled : false, // readonly
					icon : 'images/animation/play.png',
					listeners : {
						scope : this,
						'click' : this._togglePlay
					},
					tooltip : OpenLayers.i18n('play')
				});

		this.currentState = this.state.REMOVED;

		this.stepLabel = new Ext.form.Label({
					flex : 1,
					width : 115,
					style : 'padding-top: 5; padding-bottom: 5'
				});

		this.speedLabel = new Ext.form.Label({
			flex : 1,
			style : 'padding: 5',
            text: '1x'
		});

		this.buttonsPanel = new Ext.Panel({
					layout : 'hbox',
					plain : true,
					items : [this.slowDown, this.playButton, this.speedUp],
					height : 40,
					flex : 2
				});

		this.startLabel = new Ext.form.Label({
					html : "Start:"
				});

		this.endLabel = new Ext.form.Label({
					html : "End: ",
					width : 70
				});

        // TODO: refactor date/time pickers in to own component.
		this.startDatePicker = new Ext.form.DateField({
                    format : this.DATE_FORMAT,
                    disabledDatesText: "unavailable",
					editable : false,
					width : 100,
					listeners : {
						scope : this,
                        select: this._onStartDateSelected
					}

				});

		this.endDatePicker = new Ext.form.DateField({
                    format : this.DATE_FORMAT,
                    disabledDatesText: "unavailable",
					editable : false,
					width : 100,
					listeners : {
						scope : this,
						select : this._onEndDateSelected
					}
				});

        // Have to use a generic combo, as Ext.form.TimeField blats the date part of values (leaving just the
        // time of day).
        // TODO: refactor (new component?)
		this.startTimeCombo = new Ext.form.ComboBox({
            store: new Ext.data.ArrayStore({
                autoLoad : false,
			    autoDestroy : true,
			    fields : ['momentValue', 'displayTime'],
			    data : []
            }),
            mode: 'local',
			triggerAction : "all",
			editable : false,
			valueField : 'momentValue',
			displayField : 'displayTime',
			width : 130
        });
        
		this.endTimeCombo = new Ext.form.ComboBox({
            store: new Ext.data.ArrayStore({
                autoLoad : false,
			    autoDestroy : true,
			    fields : ['momentValue', 'displayTime'],
			    data : []
            }),
            mode: 'local',
			triggerAction : "all",
			editable : false,
			valueField : 'momentValue',
			displayField : 'displayTime',
			width : 130
        });

        this.dateTimeSelectorPanel = new Portal.details.AnimationDateTimeSelectorPanel({
            parent: this,
            timeControl: this.timeControl,
            width: 350
        });
/*        
		this.timeSelectorPanel = new Ext.Panel({
					layout : 'table',
					layoutConfig : {
						tableAttrs : {
							style : {
								width : '80%'
							}
						},
						columns : 3
					},
					width : 350,
					plain : true,
					items : [this.startLabel, this.startDatePicker,
							this.startTimeCombo, this.endLabel,
							this.endDatePicker, this.endTimeCombo]
				});
*/
        this.timeSelectorPanel = this.dateTimeSelectorPanel;
        
		this.getAnimationButton = new Ext.Button({
			icon : 'images/animation/download.png',
			text : 'download',
			hidden : true,
			listeners : {
				scope : this,
				click : function() {
					if (this.originalLayer.slides.length > 0) {
						// need to workout BBOX
						var clonedLayer = this.originalLayer.slides[0].clone();
						var bounds = this.originalLayer.map.getExtent();

						clonedLayer.mergeNewParams({
							TIME : this.originalLayer.slides[0].params.TIME
									+ "/"
									+ this.originalLayer.slides[this.originalLayer.slides.length
											- 1].params.TIME,
							BBOX : bounds.toBBOX(),
							FORMAT : "image/gif", // must be gif!!
							WIDTH : 512,
							HEIGHT : Math.floor(512
									* (bounds.getHeight() / bounds.getWidth()))
						});

						clonedLayer.map = this.originalLayer.map;

						var fullUrl = "proxy/downloadGif?url="
								+ clonedLayer.getFullRequestString();
						window
								.open(
										fullUrl,
										'_blank',
										"width=200,height=200,menubar=no,location=no,resizable=no,scrollbars=no,status=yes");
					}
				}
			}
		});

		this.controlPanel = new Ext.Panel({
					layout : 'form',
					plain : true,
					items : [{
						xtype : 'container',
						defaultMargins : "15 5 20 5",
						layout : {
							type : 'hbox',
							pack : 'start'

						},
						items : [this.buttonsPanel, this.stepSlider,
								this.speedLabel, this.stepLabel]
					}, this.dateTimeSelectorPanel, this.getAnimationButton],
					width : 330,
					height : '100%'
				});

		this.items = [this.controlPanel];

		this.speed = this.BASE_SPEED;
		this.mapPanel = undefined;

		this.pausedTime = "";
		this.timerId = -1;

		Portal.details.AnimationControlsPanel.superclass.initComponent.call(this);
	},

    // TODO: these can all go when pickers are moved.
    getStartDatePicker: function() {
        return this.dateTimeSelectorPanel.startDatePicker;
    },
    
    getEndDatePicker: function() {
        return this.dateTimeSelectorPanel.endDatePicker;
    },

    getStartTimeCombo: function() {
        return this.dateTimeSelectorPanel.startTimeCombo;
    },
    
    getEndTimeCombo: function() {
        return this.dateTimeSelectorPanel.endTimeCombo;
    },

	setMap : function(theMap) {
	    
		// TODO: ok, there's now a dependency on the OpenLayers Map (instead of MapPanel),
		// but hopefully this will vanish when animation is refactored.
		this.map = theMap;
        this.map.events.register('moveend', this, this._onMove);
        this.map.events.register('timechanged', this, this._onTimeChanged);
	},

    _onSelectedLayerChanged: function(subject, openLayer) {
        if (openLayer && openLayer.isAnimatable()) {
            this.selectedLayer = openLayer;
            
            this.timeControl.configureForLayer(openLayer, 10);
            this.stepSlider.setMinValue(0);
            this.stepSlider.setMaxValue(this.timeControl.getExtent().length - 1);
        }
    },
    /*
    _onTemporalExtentChanged: function(evt) {
        this.dateTimeSelectorPanel._onTemporalExtentChanged(evt);
        
        this.getStartDatePicker().setMinValue(evt.layer.min.toDate());
        this.getStartDatePicker().setMaxValue(evt.layer.max.toDate());
        this.getStartDatePicker().setValue(evt.timer.min.toDate());
        
        this.getEndDatePicker().setMinValue(evt.layer.min.toDate());
        this.getEndDatePicker().setMaxValue(evt.layer.max.toDate());
        this.getEndDatePicker().setValue(evt.timer.max.toDate());

        this._updateStartTimeCombo(evt.timer.min);
        this._updateEndTimeCombo(evt.timer.max);
    },
    */
    _onSpeedChanged: function(timeControl) {
        this._updateSpeedLabel();
        this._updateSpeedUpSlowDownButtons();
    },

    _onStartDateSelected: function(startDatePicker, jsDate) {
        this._updateStartTimeCombo(moment(jsDate));
    },

    _updateStartTimeCombo: function(dateTime) {
        this._updateTimeCombo(this.getStartTimeCombo(), dateTime);
    },
    
    _onEndDateSelected: function(startDatePicker, jsDate) {
        this._updateEndTimeCombo(moment(jsDate));
    },

    _updateEndTimeCombo: function(dateTime) {
        this._updateTimeCombo(this.getEndTimeCombo(), dateTime);
    },

    _updateTimeCombo: function(timeCombo, dateTime) {
        var datesOnDay = this.selectedLayer.getDatesOnDay(dateTime);

        var data = [];
        for (var i = 0; i < datesOnDay.length; i++) {
            data.push([datesOnDay[i], datesOnDay[i].format('HH:mm:ss (Z)')]);
        }

        timeCombo.getStore().loadData(data);
        timeCombo.setValue(dateTime.format('HH:mm:ss (Z)'));
    },
    
    _updateSpeedUpSlowDownButtons: function() {
        if (this.timeControl.isAtFastestSpeed()) {
            this.speedUp.disable();
        }
        else {
            this.speedUp.enable();
        }

        if (this.timeControl.isAtSlowestSpeed()) {
            this.slowDown.disable();
        }
        else {
            this.slowDown.enable();
        }
    },
    
    _updateSpeedLabel: function() {
        this.speedLabel.setText(this.timeControl.getRelativeSpeed() + 'x');
    },

	_togglePlay : function(button, event) {
		if (this.currentState == this.state.PLAYING) {
			this._stopPlaying();
		} else {
			this._startPlaying();
		}
	},

	_stopPlaying : function() {
        this.timeControl.stop();

		this._updateButtons(this.state.PAUSED);
	},

	_startPlaying : function() {
        this._updateButtons(this.state.PLAYING);

        this.timeControl.play();
	},

    _onTimeChanged: function(dateTime) {
        this.stepSlider.setValue(this.timeControl.getStep());
        this._setStepLabelText(dateTime.format('YYYY-MM-DD HH:mm:ss'));
    },
    
	_onDateSelected : function(field, date) {
			var key = this._toDateString(date);

			var combo;
	
			if (field === this.startDatePicker) {
				combo = this.startTimeCombo;
			} else {
				combo = this.endTimeCombo;
			}
	
			var oldValue = combo.getValue();
			
			combo.clearValue();
			combo.getStore().loadData(this.allTimes[key], false);
			
			var timeValues = new Array();
			
			for(var i =0;i < this.allTimes[key].length;i++)
			{
				timeValues[i] = this.allTimes[key][i][0]
			}
			
			var newValue;
			if (field === this.startDatePicker) {
				newValue = this._getNewTimeValue(oldValue, timeValues,0);
			} else {
				newValue = this._getNewTimeValue(oldValue, timeValues,timeValues.length-1);
			}

			combo.setValue(newValue,true);
			combo.fireEvent('select');
	},
	
	//PRE: old time must be a String or NULL, newTimes must be an array of strings, 
	//defaultIndex must be an positive integer less than the length of newTimes
	_getNewTimeValue : function(oldTime,newTimes, defaultIndex){
		for(var i =0;i < newTimes.length;i++)
		{
			if(newTimes[i] === oldTime)
			{
				return oldTime;
			}
		}
		
		//if we get to this point, then oldTime must not be available, so use default.
		return newTimes[defaultIndex]
		
	},
	
	 _onTimeSelected : function(combo, record, index) {
	 	if (this.currentState == this.state.PLAYING) {
			this._stopPlaying();
			this._startPlaying();
		} else if(combo == this.startTimeCombo) {
			var timeStr = this._getSelectedTimeString(true);
			this._setTimeAsStepLabelText(timeStr);
		}

	},

	_updateButtons : function(state) {
		this.currentState = state;

		if (state == this.state.LOADING) {
			// can't change the time when it's loading
			this.playButton.setIcon('images/animation/pause.png');
			this.stepSlider.disable();
			this.speedUp.disable();
			this.slowDown.disable();
			this.speedLabel.setVisible(false);
			this.getAnimationButton.setVisible(false);
		} else if (state == this.state.PLAYING) {
			// can't change the time when it's playing
			this.playButton.setIcon('images/animation/pause.png');
			this.stepSlider.enable();
			this.speedLabel.setVisible(true);
			this.getAnimationButton.setVisible(true);
			this._updateSpeedButtons();
		} else if (state == this.state.REMOVED) {
			this.playButton.setIcon('images/animation/play.png');
			this.startTimeCombo.enable();
			this.endTimeCombo.enable();
			this.playButton.enable();
            this.stepSlider.setValue(0);
			// nothing's playing, so stop and pause doesn't make sense

			this.speedLabel.setVisible(false);
			this.getAnimationButton.setVisible(false);

			this._updateSpeedButtons();
		} else if (state == this.state.PAUSED) {
            this.playButton.setIcon('images/animation/play.png');
            this.startTimeCombo.enable();
            this.endTimeCombo.enable();
            this.playButton.enable();
            // nothing's playing, so stop and pause doesn't make sense

            this.speedLabel.setVisible(false);
            this.getAnimationButton.setVisible(true);

            this._updateSpeedButtons();
        }

	},

	// Grey out speed buttonss if reached max multiplier
	_updateSpeedButtons : function() {
		if (this.speed * 1000 <= this.BASE_SPEED * 1000
				/ this.MAX_SPEED_MULTIPLIER) {
			this.speedUp.disable();
		} else if (this.speed >= this.MAX_SPEED_MULTIPLIER * this.BASE_SPEED) {
			this.slowDown.disable();
		} else {
			this.slowDown.enable();
			this.speedUp.enable();
		}
	},

	_onLayerVisibilityChanged : function() {
		if (!this.originalLayer.getVisibility()) {
			this._stopPlaying();
		} else {
			this.originalLayer.slides[this.stepSlider.getValue()].display(true);
		}
	},
	
	_setDateRange : function(picker, startDate, endDate) {
		picker.setMinValue(startDate);
		picker.setMaxValue(endDate);
		picker.setValue(startDate);
	},

	isAnimating : function() {
		return (this.animatedLayers.length > 0);
	},

	_setTime : function(picker, combo, timestamp) {
		picker.setValue(timestamp);
		this._onDateSelected(picker, timestamp);
		combo.setValue(timestamp.format(this.TIME_FORMAT));

	},

	_getSelectedTimeString : function(isStart) {
		if (isStart) {
			return this._toUtcIso8601DateString(
					this.startDatePicker.getValue(), this.startTimeCombo
							.getValue());
		}
		return this._toUtcIso8601DateString(this.endDatePicker.getValue(),
				this.endTimeCombo.getValue());
	},

	loadFromSavedMap : function(layer, stamps) {
		this.setSelectedLayer(layer);
	},

	_parseIso8601Date : function(string) {
		return Date.parseDate(string, "c");
	},

	_toDateString : function(date) {
		return date.format(this.DATE_FORMAT);
	},

	_toUtcDateString : function(date) {
		return date.getUTCFullYear() + "-"
				+ this._pad((date.getUTCMonth() + 1)) + "-"
				+ this._pad(date.getUTCDate());
	},

	_toTimeString : function(date) {
		return date.format(this.TIME_FORMAT);
	},

	_toUtcTimeString : function(date) {
		return this._pad(date.getUTCHours()) + ":"
				+ this._pad(date.getUTCMinutes()) + ":"
				+ this._pad(date.getUTCSeconds()) + 'Z';
	},

	_pad : function(val) {
		return val < 10 ? '0' + val : val.toString();
	},

	_getTimeComboStartDate : function(dates) {
		return this._parseIso8601Date(dates[this._getTimeComboStartIndex(dates)]);
	},

	_getTimeComboStartIndex : function(dates) {
		return dates.length > 10 ? dates.length - 10 : 0;
	},

	_toUtcIso8601DateString : function(date, timeString) {
		if (timeString) {
			return this._toUtcIso8601DateString(Date.parseDate(date
							.format(this.DATE_FORMAT)
							+ ' ' + timeString, this.DATE_TIME_FORMAT));
		}
		return this._toUtcDateString(date) + 'T' + this._toUtcTimeString(date);
	},

	_setStepLabelText : function(text) {
		this.stepLabel.setText(text, false);
	},

	_setTimeAsStepLabelText : function(dateTimeString) {
		this._setStepLabelText(this._parseIso8601Date(dateTimeString)
				.format(this.STEP_LABEL_DATE_TIME_FORMAT));
	},

	_roundToNearestFiveMinutes : function(date) {
		var roundedDate = new Date(date.getTime());
		if (roundedDate.getMinutes() > 57) {
			roundedDate.setHours(roundedDate.getHours() + 1);
		}
		roundedDate.setMinutes((Math.round(roundedDate.getMinutes() / 5) * 5)
				% 60);
		roundedDate.setSeconds(0);
		return roundedDate;
	},

	_timeComboStoreOptions : function() {
		return {
			autoLoad : false,
			autoDestroy : true,
			fields : ['time', 'roundedTime'],
			data : []
		};
	},

	_timeComboOptions : function() {
		return {
			store : new Ext.data.ArrayStore(this._timeComboStoreOptions()),
			mode : 'local',
			triggerAction : "all",
			editable : false,
			valueField : 'time',
			displayField : 'roundedTime',
			width : 130
		};
	}
});

