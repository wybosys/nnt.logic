// double ratchet algo 双棘轮算法

type keybuf_t = string;

export abstract class Conversation {

    // 会话id
    id: string;

    // 会话成员id
    users: string[];

    // 一下为协议定义的密钥对

    // 32-byte root key which gets updated by DH ratchet
    RK: keybuf_t;

    // 32-byte header keys (send and recv versions)
    HKs: keybuf_t;
    HKr: keybuf_t;

    // 32-byte next header keys (")
    NHKs: keybuf_t;
    NHKr: keybuf_t;

    // 32-byte chain keys (used for forward-secrecy updating)
    CKs: keybuf_t;
    CKr: keybuf_t;

    // DH or ECDH Ratchet keys
    DHRs: keybuf_t;
    DHRr: keybuf_t;

    // Message numbers (reset to 0 with each new ratchet)
    Ns: number;
    Nr: number;

    // Previous message numbers (# of msgs sent under prev ratchet)
    PNs: number;

    // True if the party will send a new ratchet key in next msg
    ratchet_flag: boolean;

    // A list of stored message keys and associated header keys
    // for "skipped" messages, i.e. messages that have not been
    // received despite the reception of more recent messages.
    // Entries may be stored with a timestamp, and deleted after
    // a certain age.
    skipped_HK_MK: string;
    
}

// 所有会话的管理器
export abstract class Conversations {

}
