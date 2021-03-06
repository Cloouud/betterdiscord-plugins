//META{"name":"staticAvatars"}*//

/*@cc_on
@if (@_jscript)
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you mistakenly tried to run me directly. (don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.\nJust reload Discord with Ctrl+R.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!\nJust reload Discord with Ctrl+R.", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();
@else @*/

var staticAvatars = function () {};

(function () {
    "use strict";

    // This is super hackish, and will likely break as Discord's internal API changes
    // Anything using this or what it returns should be prepared to catch some exceptions
    const getInternalInstance = e => e[Object.keys(e).find(k => k.startsWith("__reactInternalInstance"))];

    function getOwnerInstance(e, {include, exclude=["Popout", "Tooltip", "Scroller", "BackgroundFlash"]} = {}) {
        if (e === undefined) {
            return undefined;
        }

        // Set up filter; if no include filter is given, match all except those in exclude
        const excluding = include === undefined;
        const filter = excluding ? exclude : include;

        // Get displayName of the React class associated with this element
        // Based on getName(), but only check for an explicit displayName
        function getDisplayName(owner) {
            const type = owner._currentElement.type;
            const constructor = owner._instance && owner._instance.constructor;
            return type.displayName || constructor && constructor.displayName || null;
        }
        // Check class name against filters
        function classFilter(owner) {
            const name = getDisplayName(owner);
            return (name !== null && !!(filter.includes(name) ^ excluding));
        }

        // Walk up the hierarchy until a proper React object is found
        for (let prev, curr=getInternalInstance(e); !_.isNil(curr); prev=curr, curr=curr._hostParent) {
            // Before checking its parent, try to find a React object for prev among renderedChildren
            // This finds React objects which don't have a direct counterpart in the DOM hierarchy
            // e.g. Message, ChannelMember, ...
            if (prev !== undefined && !_.isNil(curr._renderedChildren)) {
                /* jshint loopfunc: true */
                let owner = Object.values(curr._renderedChildren)
                    .find(v => !_.isNil(v._instance) && v.getHostNode() === prev.getHostNode());
                if (!_.isNil(owner) && classFilter(owner)) {
                    return owner._instance;
                }
            }

            if (_.isNil(curr._currentElement)) {
                continue;
            }

            // Get a React object if one corresponds to this DOM element
            // e.g. .user-popout -> UserPopout, ...
            let owner = curr._currentElement._owner;
            if (!_.isNil(owner) && classFilter(owner)) {
                return owner._instance;
            }
        }

        return null;
    }

    // Mark elements with modified state so that they may be restored later
    const animationDisabled = new WeakSet();

    staticAvatars.prototype.start = function () {
        $(".theme-dark, .theme-light").on("mouseenter.staticavatars", ".message-group", function () {
            try {
                const messageGroup = getOwnerInstance(this, {include: ["MessageGroup"]});
                if (messageGroup.state.animatedAvatar) {
                    animationDisabled.add(this);
                    messageGroup.setState({animate: false, animatedAvatar: false});
                }
            } catch (err) {
                // Something (not surprisingly) broke, but this isn't critical enough to completely bail over
                //console.error("DiscordStaticAvatars", this, err);
                return;
            }
        });
    };

    staticAvatars.prototype.stop = function () {
        $(".theme-dark, .theme-light").off(".staticavatars", ".message-group");
        // Restore original state
        $(".message-group").each(function () {
            if (!animationDisabled.delete(this)) {
                // This element's state was not modified
                // Don't trigger a pointless re-render with setState
                return;
            }
            try {
                getOwnerInstance(this, {include: ["MessageGroup"]}).setState({animatedAvatar: true});
            } catch (err) {
                // Something (not surprisingly) broke, but this isn't critical enough to completely bail over
                //console.error("DiscordStaticAvatars", this, err);
                return;
            }
        });
    };

    staticAvatars.prototype.load = function () {};

    staticAvatars.prototype.unload = function () {};

    staticAvatars.prototype.getName = function () {
        return "Static Avatars";
    };

    staticAvatars.prototype.getDescription = function () {
        return "Don't animate avatars in the chat area";
    };

    staticAvatars.prototype.getVersion = function () {
        return "1.0.2";
    };

    staticAvatars.prototype.getAuthor = function () {
        return "noodlebox";
    };
})();

/*@end @*/
