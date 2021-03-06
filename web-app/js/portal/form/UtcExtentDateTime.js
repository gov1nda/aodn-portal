/*
 * Copyright 2014 IMOS
 *
 * The AODN/IMOS Portal is distributed under the terms of the GNU General Public License
 *
 */

Ext.namespace('Portal.form');

Portal.form.UtcExtentDateTime = Ext.extend(Ext.ux.form.DateTime, {

    initComponent: function() {
        Portal.form.UtcExtentDateTime.superclass.initComponent.call(this);
        this._preventStoreChangesBeingIgnored();
        this.tf.on('select', function(field, record, index) {
            this.onBlur(field);
        }, this);

        this.df.on('select', function(field, record, index) {
            this.onBlur(field);
        }, this);
    },

    setExtent: function(extent) {
        this.extent = extent;
        this.df.setMinValue(this.getLocalDateFromUtcMoment(extent.min(), true));
        this.df.setMaxValue(this.getLocalDateFromUtcMoment(extent.max(), true));
        this.df.setDisabledDates(extent.getMissingDays());

        this._setTimeValues(extent.min(), this.extent);
    },

    setValue: function(momentDate, toMaxTime) {
        this.df.setValue(this.getLocalDateFromUtcValues(momentDate.utc().toDate()));
        this._setTimeValues(momentDate.utc(), this.extent, toMaxTime);
    },

    getValue: function() {
        // create new instance of date using clone
        // new Date(this.dateValue) used by superclass doesn't preserve milliseconds
        // on firefox
        return this.dateValue ? this.dateValue.clone() : '';
    },
    
    reset: function() {
        this.df.reset();
        this.tf.reset();
    },

    _setTimeValues: function(date, extent, toMaxTime) {
        var dayExtent = extent.subExtentForDate(date);
        this._extentToStore(dayExtent);
        this._setTimeMinValue(dayExtent);
        this._setTimeMaxValue(dayExtent);

        if (this.timeFieldChange) {
            this._setTimeValue(date);
        }
        else {
            if (toMaxTime) {
                this._setTimeValue(dayExtent.max());
            }
            else {
                this._setTimeValue(dayExtent.min());
            }
        }
    },

    _setTimeMaxValue: function(extent) {
        this.tf.setMaxValue(this.getLocalDateFromUtcValues(extent.max().toDate()));
    },

    _setTimeMinValue: function(extent) {
        this.tf.setMinValue(this.getLocalDateFromUtcValues(extent.min().toDate()));
    },

    _setTimeValue: function(timeValue) {
        this.tf.setValue(this.getLocalDateFromUtcValues(timeValue.utc().toDate()));
        this.dateValue = timeValue.toDate();
    },

    getLocalDateFromUtcMoment: function(momentDate, toStartOfDay) {
        var clone = toStartOfDay ? momentDate.startOf('day').clone() : momentDate.clone();
        return this.getLocalDateFromUtcValues(clone.utc().toDate());
    },

    getLocalDateFromUtcValues: function(utcDate) {
        return new Date(
            utcDate.getUTCFullYear(),
            utcDate.getUTCMonth(),
            utcDate.getUTCDate(),
            utcDate.getUTCHours(),
            utcDate.getUTCMinutes(),
            utcDate.getUTCSeconds(),
            utcDate.getUTCMilliseconds()
        );
    },

    getUtcDateFromLocalValues: function(localDate) {
        var utcDate = new Date();
        utcDate.setUTCFullYear(localDate.getFullYear());
        utcDate.setUTCMonth(localDate.getMonth());
        utcDate.setUTCDate(localDate.getDate());
        utcDate.setUTCHours(localDate.getHours());
        utcDate.setUTCMinutes(localDate.getMinutes());
        utcDate.setUTCSeconds(localDate.getSeconds());
        utcDate.setUTCMilliseconds(localDate.getMilliseconds());

        return utcDate;
    },

    onBlur: function(field) {
        this._setTimeFieldChangeFlag(field);
        if (this._isDirty()) {
            this._fireEventsForChange(this._matchTime());
        }
    },

    onFocus: function() {
        this.startValue = this.dateValue;
    },

    // Ripped straight from Saki's DateTime but added calls to local onBlur to ensure values are updated
    onSpecialKey: function(field, event) {
        var key = event.getKey();
        if (key === event.TAB) {
            if (field === this.df && !event.shiftKey) {
                event.stopEvent();
                this.tf.focus();
                this.onBlur(this.df);
            }
            if (field === this.tf && event.shiftKey) {
                event.stopEvent();
                this.df.focus();
                this.onBlur(this.tf);
            }
        }
        // otherwise it misbehaves in editor grid
        if (key === event.ENTER) {
            if (field === this.df) {
                this.onBlur(this.df);
            }
            if (field === this.tf) {
                this.onBlur(this.tf);
            }
        }
    },

    _fireEventsForChange: function(value) {
        this.fireEvent("change", this, value, this.startValue);
    },

    _setTimeFieldChangeFlag: function(field) {
        if (field === this.tf) {
            this.timeFieldChange = true;
        }
        else {
            this.timeFieldChange = false;
        }
    },

    _matchTime: function() {
        var extent = this._getExtentForSelectedDate();
        var timeString = this.tf.getValue();
        for (var i = 0; i < extent.length(); i++) {
            var momentDate = extent.get(i);
            if (momentDate.utc().format('HH:mm UTC') == timeString) {
                return momentDate.toDate();
            }
        }

        return this._getDefaultTime(extent);
    },

    _getExtentForSelectedDate: function() {
        return this.extent.subExtentForDate(this.getUtcDateFromLocalValues(this.df.getValue()))
    },

    _getDefaultTime: function(extent) {
        if (this.timeFieldChange && this.startValue) {
            return this.startValue;
        }
        return extent.min().toDate();
    },

    _extentToStore: function(extent) {
        var data = new Array();
        Ext.each(extent.extent, function(momentDate, index, all) {
            data.push({
                timeValue: this.getLocalDateFromUtcValues(momentDate.toDate()),
                displayTime: momentDate.format('HH:mm UTC')
            });
        }, this);
        this.tf.getStore().loadData(data);
    },

    _preventStoreChangesBeingIgnored: function() {
        this.tf.generateStore = function() {};
    },

    _isDirty: function() {
        return this.dateValue.getTime() != this._matchTime().getTime();
    }
});
