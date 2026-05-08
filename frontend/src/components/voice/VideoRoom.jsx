import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 140px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

export default function VideoRoom({ token, url, room, hallName, onLeave }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="h-12 flex items-center justify-between px-4 flex-shrink-0 border-b"
        style={{ borderColor: 'rgba(74,122,255,0.1)', background: 'rgba(26,29,33,0.8)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-fenr-teal">🔊</span>
          <h3 className="font-semibold text-fenr-text">{hallName}</h3>
          <span className="text-fenr-teal text-xs ml-1">● Live</span>
        </div>
        <button
          onClick={onLeave}
          className="text-fenr-red hover:bg-fenr-red/20 px-3 py-1 rounded text-sm font-semibold transition-colors"
        >
          Leave Howl
        </button>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 min-h-0">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={url}
          data-lk-theme="default"
          style={{ height: '100%', background: '#1A1D21' }}
          onDisconnected={onLeave}
        >
          <Stage />
          <RoomAudioRenderer />
          <ControlBar
            controls={{
              microphone: true,
              camera: true,
              screenShare: true,
              leave: true,
              chat: false,
            }}
          />
        </LiveKitRoom>
      </div>
    </div>
  );
}
