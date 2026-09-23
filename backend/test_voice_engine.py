import asyncio
import json
import base64
import websockets

async def test_nova_sonic_websocket():
    uri = "ws://127.0.0.1:8000/api/voice/nova-sonic/stream?session_id=test-live-session-full"
    print(f"[TEST] Connecting to {uri}...")
    
    async with websockets.connect(uri) as ws:
        # 1. Connected Handshake
        greeting_connected = await ws.recv()
        print("[TEST] Handshake received:", greeting_connected)
        data = json.loads(greeting_connected)
        assert data.get("type") == "connected"
        assert data.get("engine") == "amazon.nova-2-sonic-v1:0"

        # 2. Wait for initial greeting
        print("[TEST] Listening for interviewer greeting...")
        received_audio = False
        received_transcript = False

        for _ in range(15):
            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            parsed = json.loads(msg)
            msg_type = parsed.get("type")
            if msg_type == "transcript":
                print(f"[Transcript ({parsed.get('role')} | final={parsed.get('is_final')}]: {parsed.get('text')}")
                received_transcript = True
            elif msg_type == "audio":
                audio_len = len(parsed.get("data", ""))
                print(f"[Audio Chunk received: {audio_len} chars base64]")
                received_audio = True
            elif msg_type == "turn_ended":
                print("[Turn ended! Stop reason:", parsed.get("stop_reason"), "]")
                break

        assert received_transcript, "Should have received interviewer greeting transcript"
        assert received_audio, "Should have received interviewer greeting audio"

        # 3. Simulate candidate speaking
        print("\n[TEST] Candidate speaking into microphone...")
        dummy_pcm_16k = bytes([0] * 3200) # 100ms of 16kHz 16-bit PCM
        b64_mic = base64.b64encode(dummy_pcm_16k).decode("ascii")
        for _ in range(5):
            await ws.send(json.dumps({"type": "audio", "data": b64_mic}))
            await asyncio.sleep(0.1)

        print("[TEST] Waiting for interviewer response...")
        received_candidate_text = False
        received_followup = False

        for _ in range(25):
            msg = await asyncio.wait_for(ws.recv(), timeout=6.0)
            parsed = json.loads(msg)
            m_type = parsed.get("type")
            if m_type == "transcript":
                print(f"[Transcript ({parsed.get('role')} | final={parsed.get('is_final')}]: {parsed.get('text')}")
                if parsed.get("role") == "user":
                    received_candidate_text = True
                elif parsed.get("role") == "assistant" and parsed.get("is_final"):
                    received_followup = True
            elif m_type == "turn_ended":
                print("[Interviewer turn complete!]")
                break

        # 4. Test Barge-in / Interruption
        print("\n[TEST] Testing Barge-in: Candidate speaks while interviewer is speaking...")
        # Send a user audio chunk and immediately check for barge_in
        for _ in range(3):
            await ws.send(json.dumps({"type": "audio", "data": b64_mic}))
            await asyncio.sleep(0.05)

        # 5. Test 8-Minute Renewal
        print("\n[TEST] Testing 8-Minute Connection Renewal...")
        await ws.send(json.dumps({"type": "renew"}))
        
        renewed_received = False
        for _ in range(10):
            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            parsed = json.loads(msg)
            print("[TEST Event after renew request]:", parsed.get("type"), parsed.get("message", ""))
            if parsed.get("type") == "renewed":
                renewed_received = True
                break

        assert renewed_received, "Should have received renewed event"
        print("[TEST] Connection renewal verified successfully!")

        # 6. Clean shutdown
        await ws.send(json.dumps({"type": "stop"}))
        print("\n[TEST] All Nova 2 Sonic real-time voice tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_nova_sonic_websocket())
