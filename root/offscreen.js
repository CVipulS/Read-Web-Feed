chrome.runtime.onMessage.addListener(message => {
    if (message.target !== 'offscreen') return
    const req = new XMLHttpRequest();
    req.onreadystatechange = e => {
        if (req.readyState === XMLHttpRequest.DONE) {
            chrome.runtime.sendMessage({
                target: message.data,
                data: 200 == req.status ? "rss" == req.responseXML.
                    documentElement.nodeName ? Array.from(req.responseXML.
                        querySelectorAll("rss>channel>item"), item => ({
                            title: item.querySelector("title").textContent,
                            link: item.querySelector("link").textContent
                        })) : Array.from(req.responseXML.querySelectorAll(
                            "feed>entry"), item => ({
                                title: item.querySelector("title").textContent,
                                link: (0 == item.querySelectorAll("link[rel*="
                                    + "'alternate'][type*='html']").length ?
                                    item.querySelector("link") :
                                    item.querySelector("link[rel*='alternate']"
                                        + "[type*='html']")).getAttribute
                                    ("href")
                            })) : []
            })
        }
    }
    req.open("GET", message.data);
    req.send();
})