/*
 * Copyright 2013 IMOS
 *
 * The AODN/IMOS Portal is distributed under the terms of the GNU General Public License
 *
 */

package au.org.emii.portal.proxying

abstract class RequestProxyingController {

    def index = {

        _performProxying()
    }

    def _performProxying = { paramProcessor = null, streamProcessor = null ->

        log.debug "proxying url: ${params.url}"

        def url = params.url

        if (!url) {
            render text: "No URL supplied", contentType: "text/html", encoding: "UTF-8", status: 400
        }
        else if (!hostVerifier.allowedHost(request, url)) {
            log.info "Proxy: The url $url was not allowed"
            render text: "Host for address '$url' not allowed", contentType: "text/html", encoding: "UTF-8", status: 400
        }
        else {
            def processedParams = paramProcessor ? paramProcessor(params) : params

            // Make request
            def proxiedRequest = new ProxiedRequest(request, response, processedParams)
            proxiedRequest.proxy(streamProcessor)
        }
    }
}
