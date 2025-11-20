import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Divider, 
  Link,
  CssBaseline
} from '@mui/material';
import { isMobile } from 'react-device-detect';

// --- Content Data (Original Text) ---

const FEATURES = [
  {
    heading: "Folder View",
    body: "Manage file on microcontroller",
    image: "https://placehold.co/600x400/EEE/311b92?text=Folder+View" 
  },
  {
    heading: "Code Editor",
    body: "Python highlighting and Multi-tab support",
    image: "https://placehold.co/600x400/EEE/311b92?text=Code+Editor"
  },
  {
    heading: "Serial Console",
    body: "For communication and RELP",
    image: "https://placehold.co/600x400/EEE/311b92?text=Serial+Console"
  },
  {
    heading: "Plotter",
    body: "Visualize sensor data",
    image: "https://placehold.co/600x400/EEE/311b92?text=Plotter"
  },
  {
    heading: "Library Management",
    body: "Full auto or manually",
    image: "https://placehold.co/600x400/EEE/311b92?text=Lib+Manager"
  },
  {
    heading: "Camera",
    body: "Show your microcontroller to others",
    image: "https://placehold.co/600x400/EEE/311b92?text=Camera"
  }
];

// --- Styles & Theme Constants ---

const COLORS = {
  background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8FC 100%)', // White to faint violet
  title: '#311b92', // Deep Dark Purple
  accentBorder: '#ede7f6',
  buttonBg: '#4a148c',
  textSecondary: '#5f6368',
};

const video_css = {
  width: '100%',
  height: '100%',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

const ProductPage = () => {
  React.useEffect(() => {
    document.body.style.overflow = 'auto';
  }, []);
  
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: COLORS.background,
      color: '#333'
    }}>
      <CssBaseline />

      {/* --- Top Bar --- */}
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
          borderBottom: `1px solid ${COLORS.accentBorder}`,
          backdropFilter: 'blur(8px)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" sx={{ color: COLORS.title, fontWeight: 700 }}>
            CircuitPython IDE
          </Typography>
          
          {/* Button hidden strictly on mobile devices via react-device-detect */}
          {!isMobile && (
            <Button 
              variant="contained" 
              sx={{ 
                backgroundColor: COLORS.buttonBg,
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#311b92' }
              }}
            >
              Open IDE
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        
        {/* --- Main Stage --- */}
        <Box component="section" sx={{ py: { xs: 4, md: 10 } }}>
          <Grid container spacing={6} alignItems="center">
            {/* Desktop: Image Left. Mobile: Image Top (default Grid order) */}
            <Grid item xs={12} md={6}>
              <Box 
                component="img"
                src="https://placehold.co/800x600/EEE/311b92?text=Product+Showcase"
                alt="CircuitPython Online IDE"
                sx={{ 
                  width: '100%', 
                  height: 'auto', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(49, 27, 146, 0.08)',
                  border: `1px solid ${COLORS.accentBorder}`
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ color: COLORS.title, fontWeight: 700 }}>
                CircuitPython Online IDE
              </Typography>
              <Typography variant="h6" sx={{ color: COLORS.textSecondary, fontWeight: 400, lineHeight: 1.6 }}>
                A browser-based IDE for CircuitPython supported microcontrollers.
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ borderColor: COLORS.accentBorder }} />

        {/* --- Feature Section --- */}
        <Box component="section" sx={{ py: { xs: 6, md: 8 } }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ color: COLORS.title, mb: 6, fontWeight: 600 }}>
            Features
          </Typography>
          <Grid container spacing={4}>
            {FEATURES.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: '12px',
                    border: `1px solid ${COLORS.accentBorder}`,
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={feature.image}
                    alt={feature.heading}
                    sx={{ backgroundColor: '#f5f5f5' }}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h6" component="div" sx={{ color: COLORS.title, fontWeight: 600 }}>
                      {feature.heading}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.body}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ borderColor: COLORS.accentBorder }} />

        {/* --- Quick Start Section --- */}
        <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
          <Grid container spacing={6} alignItems="center">
            {/* Desktop: Video Left. Mobile: Video Only */}
            <Grid item xs={12} md={7}>
              <Box sx={{ 
                position: 'relative', 
                paddingBottom: '56.25%', // 16:9 Aspect Ratio
                height: 0, 
                overflow: 'hidden', 
                borderRadius: '12px' 
              }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                   <iframe
                        style={video_css}
                        frameBorder={0}
                        src="https://www.youtube.com/embed/kq554m21G4A?si=xLRUJNfd6tvAqGuH&cc_load_policy=1&cc_lang_pref=en"
                        title="Quick Start Guide"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    ></iframe>
                </Box>
              </Box>
            </Grid>
            
            {/* Text hidden on mobile (xs: 'none'), visible on desktop (md: 'block') */}
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography variant="h4" component="h2" sx={{ color: COLORS.title, fontWeight: 600 }}>
                Quick Start Guide
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ borderColor: COLORS.accentBorder }} />

        {/* --- Footer --- */}
        <Box component="footer" sx={{ py: 6 }}>
          <Grid container spacing={4}>
            {/* About Column */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom sx={{ color: COLORS.title, fontWeight: 600 }}>
                About
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: COLORS.textSecondary }}>
                Version: 2.2.1
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: COLORS.textSecondary }}>
                <Link href="https://circuitpython.org/" target="_blank" color="inherit" underline="hover">CircuitPython</Link> is a version of Python that runs on microcontrollers and single-board computers. Its development is sponsored by <Link href="https://www.adafruit.com/" target="_blank" color="inherit" underline="hover">Adafruit</Link>.
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                The <strong>CircuitPython Online IDE</strong> is an open-source project published on GitHub Pages under the GPL 3 license. Developed and maintained by <Link href="https://github.com/urfdvw" target="_blank" color="inherit" underline="hover">River Wang</Link>.
              </Typography>
            </Grid>

            {/* Contact Column */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom sx={{ color: COLORS.title, fontWeight: 600 }}>
                Contact Me
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: COLORS.textSecondary }}>
                For IDE feedback, please check <Link href="https://docs.google.com/forms/d/e/1FAIpQLSdupiJIRViFwPpuQC1hMp8gRvhxACLoAjgepm_-IRZumwK7Cg/viewform" target="_blank" color="secondary" underline="hover">this survey</Link>.
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                For other communications, please send an email to: <br />
                <Box component="span" sx={{ color: COLORS.title, fontWeight: 500 }}>urfdvw@gmail.com</Box>
              </Typography>
            </Grid>

            {/* Socials Column */}
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom sx={{ color: COLORS.title, fontWeight: 600 }}>
                Connect
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link href="https://twitter.com/River___Wang" target="_blank" color="inherit" underline="hover" sx={{ display: 'block', color: COLORS.textSecondary }}>
                  Twitter: @River___Wang
                </Link>
                <Link href="https://www.youtube.com/channel/UCeunCRTBkjHWynMl4I4le_A" target="_blank" color="inherit" underline="hover" sx={{ display: 'block', color: COLORS.textSecondary }}>
                  YouTube: @Riverwang
                </Link>
                <Link href="https://fosstodon.org/@Riverwang" target="_blank" color="inherit" underline="hover" sx={{ display: 'block', color: COLORS.textSecondary }}>
                  Mastodon: @Riverwang@fosstodon.org
                </Link>
              </Box>
            </Grid>
          </Grid>
          
          {/* Copyright / Bottom Line */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
             <Typography variant="caption" color="text.secondary">
                © {new Date().getFullYear()} CircuitPython Online IDE.
             </Typography>
          </Box>
        </Box>

      </Container>
    </Box>
  );
};

export default ProductPage;