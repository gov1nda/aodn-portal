/*
 * Copyright 2012 IMOS
 *
 * The AODN/IMOS Portal is distributed under the terms of the GNU General Public License
 *
 */

Ext.namespace('Portal.filter');

Portal.filter.FilterGroupPanel = Ext.extend(Ext.Panel, {
    constructor: function(cfg) {

        this.loadingMessage = this.createLoadingMessageContainer();
        this.errorMessage = this.createErrorMessageContainer();

        var config = Ext.apply({
            layout: 'table',
            autoScroll: true,
            layoutConfig: {
                // The total column count must be specified here
                columns: 1,
                tableAttrs: {
                    cellspacing: '10px',
                    style: {
                        width: '100%'
                    }
                }
            },
            autoDestroy: true,
            items: [this.loadingMessage]
        }, cfg);

        this.GET_FILTER = "layer/getFiltersAsJSON";
        this.filters = [];

        Portal.filter.FilterGroupPanel.superclass.constructor.call(this, config);
    },

    initComponent: function() {
        this.AND_QUERY = " AND ";
        this.on('addFilter', this._handleAddFilter);

        Portal.filter.FilterGroupPanel.superclass.initComponent.call(this);
    },

    createLoadingMessageContainer: function() {
        return new Ext.Container({
            autoEl: 'div',
            html: OpenLayers.i18n('loadingSpinner', {resource: OpenLayers.i18n('subsetParametersText')})
        });
    },

    createErrorMessageContainer: function(msg) {
        return new Ext.Container({
            autoEl: 'div',
            html: "<i>" + msg + "</i>"
        })
    },

    addLoadingMessage: function() {
        this.loadingMessage = new this.createLoadingMessageContainer();
        this.add(this.loadingMessage);
    },

    removeLoadingMessage: function() {
        this.remove(this.loadingMessage);
        delete this.loadingMessage;
    },

    addErrorMessage: function(msg) {
        this.removeLoadingMessage();
        this.errorMessage = this.createErrorMessageContainer(msg);
        this.add(this.errorMessage);
        this.doLayout();
    },

    _isLayerActive: function(layer) {
        return (Portal.data.ActiveGeoNetworkRecordStore.instance().isRecordActive(layer.parentGeoNetworkRecord));
    },

    _addLabel: function(filter) {

        var labelText = filter.label.split('_').join(' ').toTitleCase();
        var label = new Ext.form.Label({
            html: "<h4>" + labelText + "</h4>"
        });
        this.add(label);
    },

    handleLayer: function(layer, show, hide, target) {

        this.layer = layer;

        this.removeAll();
        this.doLayout();
        this.addLoadingMessage();

        if (layer.filters) {
            this._showHideFilters(layer, show, hide, target);
        }
        else if (layer.isKnownToThePortal()) {

            Ext.Ajax.request({
                url: this.GET_FILTER,
                params: {
                    layerId: layer.grailsLayerId
                },
                scope: this,
                failure: function() {
                    this._hide(hide, target);
                },
                success: function(resp, opts) {
                    layer.filters = Ext.util.JSON.decode(resp.responseText);
                    this._showHideFilters(layer, show, hide, target);
                }
            });
        }
        else {
            this.addErrorMessage(OpenLayers.i18n('subsetParametersErrorText'));
        }
    },

    _showHideFilters: function(layer, show, hide, target) {

        var aFilterIsEnabled = false;
        if (this._isLayerActive(layer) && (layer.filters.length > 0)) {

            Ext.each(
                layer.filters,
                function(filterConfig, index, all) {
                    this._createFilterPanel(layer, filterConfig);
                    aFilterIsEnabled = true;
                },
                this
            );
        }

        if (aFilterIsEnabled) {
            this._updateAndShow(show, target);
        }
        else {
            this.addErrorMessage(OpenLayers.i18n('subsetEmptyFiltersText'));
        }
    },

    _createFilterPanel: function(layer, filter) {

        var newFilterPanel = Portal.filter.BaseFilterPanel.newFilterPanelFor({
            filter: filter,
            layer: layer
        });

        if (newFilterPanel) {
            this.relayEvents(newFilterPanel, ['addFilter']);
            if (newFilterPanel.getFilterName()) {
                this._addLabel(filter);
            }

            this.add(newFilterPanel);
            this.filters.push(newFilterPanel);

            return newFilterPanel;
        }
    },

    _updateAndShow: function(showFunction, showFunctionTarget) {

        this.clearFiltersButton = new Ext.Button({
            cls: "x-btn-text-icon",
            icon: "images/go-back-icon.png",
            text: OpenLayers.i18n('clearFilterButtonLabel'),
            listeners: {
                scope: this,
                click: this._clearFilters
            }
        });

        this.loadingMessage.hide();

        this._updateLayerFilters();

        this.add(this.clearFiltersButton);
        this.doLayout();

        showFunction.call(showFunctionTarget, this);
    },

    _hide: function(hideFunction, hideFunctionTarget) {

        hideFunction.call(hideFunctionTarget, this);
    },

    _updateLayerFilters: function() {
        if (this._isLayerActive(this.layer)) {
            this.layer.setCqlFilter(this._getVisualisationCQLFilter());
            this.layer.downloadOnlyFilters = this._getDownloadCQLFilter();
            this.layer.wmsDownloadOnlyFilters = this._getWmsDownloadCQLFilter();
        }
    },

    _getVisualisationCQLFilter: function() {
        var cql = [];

        Ext.each(this._getActiveFilters(), function(filter) {
            var filterCQL = filter.getVisualisationCQL();
            if (filterCQL) {
                cql.push(filter.getVisualisationCQL());
            }
        });

        return cql.join(this.AND_QUERY);
    },

    _getDownloadCQLFilter: function() {
        var cql = [];

        Ext.each(this._getActiveFilters(), function(filter) {
            cql.push(filter.getDownloadCQL());
        });

        return cql.join(this.AND_QUERY);
    },

    _getWmsDownloadCQLFilter: function() {
        var cql = [];

        Ext.each(this._getActiveFilters(), function(filter) {
            cql.push(filter.getWmsDownloadCQL());
        });

        return cql.join(this.AND_QUERY);
    },

    _getCqlFilter: function(options) {
        var cqlValues = [];

        Ext.each(this._getActiveFilters(), function(filter) {

            if (filter.isDownloadOnly() == options.downloadOnly) {

                var cql;
                if (options.downloadOnly) {
                    cql = filter.getDownloadCQL();
                }
                else {
                    cql = filter.getVisualisationCQL();
                }

                cqlValues.push(cql);
            }
        });

        return cqlValues.join(this.AND_QUERY);
    },

    _getActiveFilters: function() {
        var activeFilters = [];

        Ext.each(this.filters, function(filter) {
            if (filter.hasValue()) {
                activeFilters.push(filter);
            }
        });

        return activeFilters;
    },

    _handleAddFilter: function(aFilter) {
        this._updateLayerFilters();
    },

    _clearFilters: function() {
        Ext.each(this.filters, function(filter) {
            filter.handleRemoveFilter();
        });

        this._updateLayerFilters();
    }
});
