import {SessionStorageMemory} from "../sessionstorage_memory";
import {use} from "../../../../core/kernel";
import {Device} from "../model";
import {Address} from "../address";

class ChatMessage {
    from: Address;
    to: Address;
    content: string;
}

// 保存在服务端的用户数据
class ServerUser {

    constructor(address: Address) {
        this.address = address;
    }

    address: Address;
    online: boolean;
}

// 客户端用户数据
class ClientUser {

    constructor(address: Address) {
        this.address = address;
    }

    address: Address;
    store = new SessionStorageMemory();
    device = new Device();

    server: TestServer;

    // 发送消息
    send(to: string, content: string) {
        let msg = new TestMessage();
        msg.from = this.name;
        msg.to = to;
        msg.content = content;
        this.server.send(msg);
    }

    // 收到消息
    ongot(msg: TestMessage) {
        console.log(`收到消息${msg.content}`);
    }
}

class ChatServer {

    store = new SessionStorageMemory();

    onlines = new Map<number, ServerUser>();
    users = new Map<number, ServerUser>();

    register(user: Address) {
        this.users.set(user.hash, new ServerUser(user));
    }

    login(user: Address) {
        let fnd = this.users.get(user.hash);
        if (fnd) {
            fnd.online = true;
            this.onlines.set(user.hash, fnd);
        } else {
            throw new Error("没有找到用户");
        }
    }

    logout(user: Address) {
        let fnd = this.onlines.get(user.hash);
        if (fnd) {
            this.onlines.delete(user.hash);
        }
    }

    send(msg: ChatMessage) {

    }
}

export function test_chat() {

    let server = new ChatServer();

    let alice = new TestUser("alice", 1);
    let bob = new TestUser("bob", 1);

    server.register(alice);
    server.register(bob);

    server.login(alice);
    server.login(bob);

    let messages = [
        use(new TestMessage(), msg => {
            msg.from = "alice";
            msg.to = "bob";
            msg.content = "hello from alice";
        }),
        use(new TestMessage(), msg => {
            msg.from = "bob";
            msg.to = "alice";
            msg.content = "hello from bob";
        })
    ];

    messages.forEach(msg => {
        let usr = server.users.get(msg.from);
        usr.send(msg.to, msg.content);
    });
}