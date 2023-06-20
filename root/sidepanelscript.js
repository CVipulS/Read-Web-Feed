var port = chrome.runtime.connect({ name: "sidepanel" })
port.onDisconnect.addListener(_ => window.close())

let get_liMarkUp = (myURL, myTitle, subscribed = false, myWaitInterval = 0,
    myDay = 4, mySeconds = 61230, myMeta = `${myURL}<br />${myTitle}`) =>
    `<li><label><input type="checkbox" ${subscribed ? 'checked = "true"' : ""}`
    + `/><data value="${myURL}">${myTitle}</data></label><details><summary>`
    + `${myURL}</summary><label>pull interval: <select><option value="1" ${1 !=
        myWaitInterval ? 'selected="true"' : ''}>Daily</option><option value="`
    + `2" ${1 != myWaitInterval ? '' : 'selected="true"'}>Weekly</option></sel`
    + `ect> </label><label ${1 != myWaitInterval ? 'hidden="true"' : ''}>Weekd`
    + `ay<input type="range" list="days" min="1" max="7" value="${myDay}"/></l`
    + `abel><span ${1 != myWaitInterval ? 'hidden="true"' : ''}>${document.body
        .querySelector("#days>option:nth-child(" + myDay + ")").label}</span><l`
    + `abel><input type="number" min="1395" max="86400" value="${mySeconds}" /`
    + `> seconds</label><aside contenteditable='true'>${myMeta}</aside></detai`
    + `ls></li>`

let pushFeeds = (element_id, feeds) => {
    let myFeeds = document.querySelector('#' + element_id)
    if ("subscribed" == element_id) myFeeds.innerHTML = ""
    feeds.forEach(feed_entry => {
        let line4feed = (2 == Object.keys(feed_entry).length ?
            get_liMarkUp(feed_entry.href, feed_entry.title) : get_liMarkUp(
                feed_entry.href, feed_entry.title, "subscribed" == element_id,
                feed_entry.frequency, feed_entry.day, feed_entry.waits,
                feed_entry.meta))
        if ("subscribed" == element_id) line4feed = line4feed.slice(0, -15) +
            "<menu>" + feed_entry.posts.map(post => '<li><a href="' + post.link
                + '" target="_blank" ' + (Object.hasOwn(post, 'visited') ? '' :
                    'style="font-weight: bold"') + '>' + post.title +
                "</a></li>").join('') + "</menu>" + line4feed.slice(-15)
        myFeeds.innerHTML += line4feed
    })
}
port.onMessage.addListener(msg => {
    switch (msg.title) {
        case "new":
            document.querySelector("#newFeeds").innerHTML += get_liMarkUp
                (msg.feedURL, msg.feedTitle)
            port.postMessage({ title: "new" }); break
        case "subscribed": case "discarded": pushFeeds(msg.title, msg.feeds)
            break
        case "new feeds": pushFeeds("newFeeds", msg.feeds)
            port.postMessage({ title: "new feeds" }); break
        case "updated":
            let subscriptionli = document.querySelector("#newFeeds li:has("
                + "input[type=checkbox]:checked)")
            if (null == subscriptionli) subscriptionli = document.querySelector
                ("#discarded li:has(input[type=checkbox]:checked)")
            if (null != subscriptionli)
                document.querySelector('#subscribed').appendChild(
                    subscriptionli.parentElement.removeChild(subscriptionli))
            else {
                subscriptionli = document.querySelector("#subscribed li:has("
                    + "input[type=checkbox]:not(:checked)")
                if (null != subscriptionli) document.querySelector('#discarded'
                ).appendChild(subscriptionli.parentElement.removeChild(
                    subscriptionli))
            }
    }
})

let postUpdate = li4feed => port.postMessage({
    title: 'subscription',
    idURL: li4feed.children[0].children[1].value,
    daysFrequency:
        li4feed.children[1].children[1].children[0].selectedIndex,
    day: li4feed.children[1].children[2].children[0].value,
    duration: li4feed.children[1].children[4].children[0].value,
    customMeta: li4feed.children[1].children[5].textContent
})

document.body.addEventListener('input', e => {
    let feedli
    switch (e.target.nodeName) {
        case 'aside':
            feedli = e.target.parentElement.parentElement; break
        case 'select':
            e.target.parentElement.nextSibling.nextSibling.hidden =
                e.target.parentElement.nextSibling.hidden = 1 != e.target.
                    selectedIndex, feedli = e.target.parentElement.
                        parentElement.parentElement
    }
    if (undefined == feedli) return
    if (feedli.children[0].children[0].checked) postUpdate(feedli)
})

document.body.addEventListener('change', e => {
    if ('input' != e.target.nodeName) return
    let feedli
    switch (e.target.type) {
        case 'checkbox':
            feedli = e.target.parentElement.parentElement
            if (e.target.checked) postUpdate(feedli)
            else port.postMessage({
                title: 'discard',
                idURL: feedli.children[0].children[1].value
            })
            break;
        case 'range': e.target.parentElement.nextSibling.innerText = document.
            body.querySelector("#days>option:nth-child(" + e.target.value + ")"
            ).label + ' '
        default: feedli = e.target.parentElement.parentElement.parentElement
            if (feedli.children[0].children[0].checked) postUpdate(feedli)
    }
})