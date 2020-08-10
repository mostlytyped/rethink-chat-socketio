let username = Math.random().toString(36).substring(2, 8);

const ChatRoom = Vue.component('chat-room', {
    props: ['roomId'],
    data() {
        return {
            chats: [],
            message: "",
            username: username,
            handle: null,
        };
    },
    async created() {
        const url = new URL(document.location.protocol + '//' + document.location.host + '/db/chats');
        url.searchParams.append('orderBy', 'ts');
        url.searchParams.append('order', 'desc');
        url.searchParams.append('roomId', this.roomId);
        const chatsResp = await fetch(url);
        const { data, handle } = await chatsResp.json();
        this.chats = data;
        this.handle = handle;
        socket.on(this.handle, msg => {
            this.chats.unshift(msg);
        });
    },
    beforeDestroy() {
        socket.off(this.handle);
    },
    methods: {
        sendMessage() {
            socket.emit('chats', { msg: this.message, user: this.username, roomId: this.roomId });
            this.message = "";
        }
    },
    template: `
<div class="chatroom">
    <ul id="chatlog">
        <li v-for="chat in chats">
            <span class="timestamp">
                {{ new Date(chat.ts).toLocaleString(undefined, {dateStyle: 'short', timeStyle: 'short'}) }}
            </span>
            <span class="user">{{ chat.user }}:</span>
            <span class="msg">{{ chat.msg }}</span>
        </li>
    </ul>
    <label id="username">Username:
        {{ username }}
    </label>
    <form v-on:submit.prevent="sendMessage">
        <input v-model="message" autocomplete="off" />
        <button>Send</button>
    </form>
</div>
    `
});

const RoomView = Vue.component('room-view', {
    template: `<chat-room :roomId="$route.params.roomId"/>`
});

const MainView = Vue.component('main-view', {
    data() {
        return {
            room: "lobby",
            user: username,
        };
    },
    methods: {
        gotoRoom() {
            username = this.user;
            this.$router.push({ name: 'room', params: { roomId: this.room } });
        }
    },
    template: `
<div class="main">
    <form class="main" v-on:submit.prevent="gotoRoom">
    <label>Username: <input v-model="user" type="text" /></label>
    <label>Room: <input v-model="room" type="text" /></label>
    <button>Join</button>
    </form>
</div>
    `
});

const routes = [
    { path: '/', component: MainView },
    { path: '/:roomId', name: 'room', component: RoomView },
];
const router = new VueRouter({
    routes
})

var socket = io();
var app = new Vue({
    router
}).$mount('#app');
